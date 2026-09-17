<#
.SYNOPSIS
Verifies backup checksums and, optionally, a restored Supabase database.

.EXAMPLE
.\scripts\ops\verify-full-database.ps1 -BackupDirectory $backup

.EXAMPLE
.\scripts\ops\verify-full-database.ps1 `
  -BackupDirectory $backup `
  -DatabaseUrl $env:TARGET_DATABASE_URL `
  -ProjectRef "target-ref"
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$BackupDirectory,

  [Parameter()]
  [string]$DatabaseUrl = "",

  [Parameter()]
  [string]$ProjectRef = "",

  [Parameter()]
  [switch]$SkipRowCounts
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Get-ProjectRefFromUrl {
  param([string]$Url)

  if ($Url -match "@db\.([a-z0-9-]+)\.supabase\.co") {
    return $Matches[1]
  }
  if ($Url -match "postgres(?:ql)?://postgres\.([a-z0-9-]+):") {
    return $Matches[1]
  }
  return ""
}

function ConvertTo-SqlLiteral {
  param([string]$Value)
  return "'" + $Value.Replace("'", "''") + "'"
}

function ConvertFrom-SqlIdentifier {
  param([string]$Name)

  if ($Name.StartsWith('"') -and $Name.EndsWith('"')) {
    return $Name.Substring(1, $Name.Length - 2).Replace('""', '"')
  }
  return $Name
}

function Split-QualifiedName {
  param([string]$Name)

  $identifier = '(?:"(?:[^"]|"")*"|[A-Za-z_][A-Za-z0-9_$]*)'
  $match = [regex]::Match($Name, "^(?<schema>$identifier)\.(?<object>$identifier)$")
  if (-not $match.Success) {
    throw "Unsupported qualified SQL identifier in manifest: $Name"
  }
  $schema = $match.Groups["schema"].Value
  $object = $match.Groups["object"].Value
  if ($schema.StartsWith('"')) {
    $schema = $schema.Substring(1, $schema.Length - 2).Replace('""', '"')
  }
  if ($object.StartsWith('"')) {
    $object = $object.Substring(1, $object.Length - 2).Replace('""', '"')
  }
  return @($schema, $object)
}

$BackupDirectory = (Resolve-Path -LiteralPath $BackupDirectory).Path
$manifestPath = Join-Path $BackupDirectory "manifest.json"
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
  throw "manifest.json was not found in $BackupDirectory"
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if ([int]$manifest.formatVersion -ne 2) {
  throw "Unsupported backup format version: $($manifest.formatVersion)"
}

$artifactEntries = @($manifest.artifacts)
$artifactNames = @($artifactEntries | ForEach-Object { [string]$_.file })
$requiredNames = @("roles.sql", "schema.sql", "data.sql", "history_schema.sql", "history_data.sql")
if ($artifactNames.Count -ne $requiredNames.Count) {
  throw "Manifest must contain exactly the five required SQL artifacts."
}
foreach ($requiredName in $requiredNames) {
  if (@($artifactNames | Where-Object { $_ -ceq $requiredName }).Count -ne 1) {
    throw "Manifest must contain exactly one checksum entry for $requiredName."
  }
}
if (@($artifactNames | Select-Object -Unique).Count -ne $artifactNames.Count) {
  throw "Manifest contains duplicate artifact entries."
}

$artifactCount = 0
foreach ($artifact in $manifest.artifacts) {
  $path = Join-Path $BackupDirectory ([string]$artifact.file)
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "Missing artifact: $($artifact.file)"
  }
  $item = Get-Item -LiteralPath $path
  if ([long]$item.Length -ne [long]$artifact.bytes) {
    throw "File size mismatch for $($artifact.file)."
  }
  $actualHash = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actualHash -ne ([string]$artifact.sha256).ToLowerInvariant()) {
    throw "SHA-256 mismatch for $($artifact.file)."
  }
  $artifactCount++
}

Write-Host "Backup artifact verification passed ($artifactCount files)."

if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
  Write-Host "Database URL not supplied; database object and row-count checks were skipped."
  return
}

$derivedRef = Get-ProjectRefFromUrl -Url $DatabaseUrl
if (-not [string]::IsNullOrWhiteSpace($ProjectRef)) {
  if ([string]::IsNullOrWhiteSpace($derivedRef)) {
    throw "The project reference could not be derived from the database URL."
  }
  if ($ProjectRef -ne $derivedRef) {
    throw "ProjectRef does not match the database URL."
  }
}

$psqlCommand = Get-Command "psql" -ErrorAction SilentlyContinue
if (-not $psqlCommand) {
  throw "psql was not found. Install PostgreSQL 15+ command-line tools and add their bin directory to PATH."
}

$tempSql = Join-Path ([System.IO.Path]::GetTempPath()) ("ccshau-verify-" + [Guid]::NewGuid().ToString("N") + ".sql")
$sql = New-Object "System.Collections.Generic.List[string]"
$sql.Add("\set ON_ERROR_STOP on")
$sql.Add("CREATE TEMP TABLE expected_objects(kind text, schema_name text, object_name text);")

foreach ($table in $manifest.inventory.tables) {
  $parts = Split-QualifiedName -Name ([string]$table)
  $sql.Add("INSERT INTO expected_objects VALUES ('table', $(ConvertTo-SqlLiteral $parts[0]), $(ConvertTo-SqlLiteral $parts[1]));")
}
foreach ($functionName in $manifest.inventory.functions) {
  $parts = Split-QualifiedName -Name ([string]$functionName)
  $sql.Add("INSERT INTO expected_objects VALUES ('function', $(ConvertTo-SqlLiteral $parts[0]), $(ConvertTo-SqlLiteral $parts[1]));")
}
foreach ($procedureName in $manifest.inventory.procedures) {
  $parts = Split-QualifiedName -Name ([string]$procedureName)
  $sql.Add("INSERT INTO expected_objects VALUES ('procedure', $(ConvertTo-SqlLiteral $parts[0]), $(ConvertTo-SqlLiteral $parts[1]));")
}
foreach ($viewName in $manifest.inventory.views) {
  $parts = Split-QualifiedName -Name ([string]$viewName)
  $sql.Add("INSERT INTO expected_objects VALUES ('view', $(ConvertTo-SqlLiteral $parts[0]), $(ConvertTo-SqlLiteral $parts[1]));")
}
foreach ($triggerName in $manifest.inventory.triggers) {
  $sql.Add("INSERT INTO expected_objects VALUES ('trigger', '', $(ConvertTo-SqlLiteral (ConvertFrom-SqlIdentifier ([string]$triggerName))));")
}
foreach ($policyName in $manifest.inventory.policies) {
  $sql.Add("INSERT INTO expected_objects VALUES ('policy', '', $(ConvertTo-SqlLiteral (ConvertFrom-SqlIdentifier ([string]$policyName))));")
}
foreach ($indexName in $manifest.inventory.indexes) {
  $parts = Split-QualifiedName -Name ([string]$indexName)
  $sql.Add("INSERT INTO expected_objects VALUES ('index', $(ConvertTo-SqlLiteral $parts[0]), $(ConvertTo-SqlLiteral $parts[1]));")
}

$sql.Add(@"
DO `$verify_objects`$
DECLARE
  missing_count integer;
BEGIN
  SELECT count(*) INTO missing_count
  FROM expected_objects e
  WHERE
    (e.kind = 'table' AND NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = e.schema_name
        AND c.relname = e.object_name
        AND c.relkind IN ('r', 'p')
    ))
    OR
    (e.kind = 'function' AND NOT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = e.schema_name
        AND p.proname = e.object_name
        AND p.prokind = 'f'
    ))
    OR
    (e.kind = 'procedure' AND NOT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = e.schema_name
        AND p.proname = e.object_name
        AND p.prokind = 'p'
    ))
    OR
    (e.kind = 'view' AND NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = e.schema_name
        AND c.relname = e.object_name
        AND c.relkind IN ('v', 'm')
    ))
    OR
    (e.kind = 'trigger' AND NOT EXISTS (
      SELECT 1 FROM pg_trigger t
      WHERE t.tgname = e.object_name
        AND NOT t.tgisinternal
    ))
    OR
    (e.kind = 'policy' AND NOT EXISTS (
      SELECT 1 FROM pg_policy p
      WHERE p.polname = e.object_name
    ))
    OR
    (e.kind = 'index' AND NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = e.schema_name
        AND c.relname = e.object_name
        AND c.relkind IN ('i', 'I')
    ));

  IF missing_count > 0 THEN
    RAISE EXCEPTION 'Restore verification failed: % expected database objects are missing', missing_count;
  END IF;
END
`$verify_objects`$;
"@)

$sql.Add("CREATE TEMP TABLE expected_counts(schema_name text, table_name text, expected_count bigint);")
if (-not $SkipRowCounts) {
  foreach ($property in $manifest.inventory.rowCounts.PSObject.Properties) {
    $parts = Split-QualifiedName -Name ([string]$property.Name)
    # Exact row checks are limited to CCSHAU application tables. Auth/session
    # tables may legitimately change as users authenticate after a restore.
    if ($parts[0] -eq "public" -and $parts[1] -like "ccshau_*") {
      $expectedCount = [long]$property.Value
      $sql.Add("INSERT INTO expected_counts VALUES ($(ConvertTo-SqlLiteral $parts[0]), $(ConvertTo-SqlLiteral $parts[1]), $expectedCount);")
    }
  }
}

$sql.Add(@"
CREATE TEMP TABLE actual_counts(schema_name text, table_name text, actual_count bigint);
DO `$verify_counts`$
DECLARE
  item record;
  counted bigint;
BEGIN
  FOR item IN SELECT * FROM expected_counts LOOP
    EXECUTE format('SELECT count(*) FROM %I.%I', item.schema_name, item.table_name) INTO counted;
    INSERT INTO actual_counts VALUES (item.schema_name, item.table_name, counted);
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM expected_counts e
    JOIN actual_counts a USING (schema_name, table_name)
    WHERE e.expected_count <> a.actual_count
  ) THEN
    RAISE EXCEPTION 'Restore verification failed: one or more CCSHAU table row counts differ from the backup';
  END IF;
END
`$verify_counts`$;

SELECT
  (SELECT count(*) FROM expected_objects) AS verified_objects,
  (SELECT count(*) FROM expected_counts) AS verified_ccshau_table_counts;
"@)

try {
  [System.IO.File]::WriteAllLines($tempSql, $sql, (New-Object System.Text.UTF8Encoding($false)))
  $previousPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    & $psqlCommand.Source `
      "--variable" "ON_ERROR_STOP=1" `
      "--file" $tempSql `
      "--dbname" $DatabaseUrl
    $nativeExitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousPreference
  }
  if ($nativeExitCode -ne 0) {
    throw "Database verification failed with exit code $nativeExitCode."
  }
  Write-Host "Database object and CCSHAU row-count verification passed."
} finally {
  if (Test-Path -LiteralPath $tempSql) {
    Remove-Item -LiteralPath $tempSql -Force
  }
}
