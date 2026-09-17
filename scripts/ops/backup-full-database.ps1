<#
.SYNOPSIS
Creates a portable Supabase logical database backup (Storage files excluded).

.EXAMPLE
$env:SOURCE_DATABASE_URL = "postgresql://postgres.PROJECT:PASSWORD@HOST:5432/postgres"
npm run backup:database

.EXAMPLE
.\scripts\ops\backup-full-database.ps1 -DatabaseUrl $env:SOURCE_DATABASE_URL -ProjectRef "project-ref"
#>
[CmdletBinding()]
param(
  [Parameter()]
  [string]$DatabaseUrl = $env:SOURCE_DATABASE_URL,

  [Parameter()]
  [string]$ProjectRef = $env:SUPABASE_PROJECT_REF,

  [Parameter()]
  [string]$OutputRoot = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $OutputRoot = Join-Path $RepoRoot "backups\database"
} elseif (-not [System.IO.Path]::IsPathRooted($OutputRoot)) {
  $OutputRoot = Join-Path $RepoRoot $OutputRoot
}

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

function Assert-Command {
  param([string]$Name, [string]$InstallHint)

  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $command) {
    throw "Required command '$Name' was not found. $InstallHint"
  }
  return $command.Source
}

function Invoke-Checked {
  param(
    [string]$Command,
    [string[]]$Arguments,
    [string]$Description
  )

  Write-Host $Description
  $previousPreference = $ErrorActionPreference
  try {
    # PowerShell 5.1 surfaces native stderr as ErrorRecord objects. The native
    # exit code, not stderr presence, determines command success.
    $ErrorActionPreference = "Continue"
    & $Command @Arguments
    $nativeExitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousPreference
  }
  if ($nativeExitCode -ne 0) {
    throw "$Description failed with exit code $nativeExitCode."
  }
}

function Assert-BackupFile {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "Expected backup artifact was not created: $Path"
  }
  if ((Get-Item -LiteralPath $Path).Length -eq 0) {
    throw "Backup artifact is empty: $Path"
  }
}

function Get-SqlInventory {
  param([string]$SchemaPath, [string[]]$DataPaths)

  $tables = New-Object "System.Collections.Generic.HashSet[string]"
  $functions = New-Object "System.Collections.Generic.HashSet[string]"
  $procedures = New-Object "System.Collections.Generic.HashSet[string]"
  $views = New-Object "System.Collections.Generic.HashSet[string]"
  $triggers = New-Object "System.Collections.Generic.HashSet[string]"
  $policies = New-Object "System.Collections.Generic.HashSet[string]"
  $indexes = New-Object "System.Collections.Generic.HashSet[string]"
  $rowCounts = [ordered]@{}

  $reader = [System.IO.File]::OpenText($SchemaPath)
  try {
    while (($line = $reader.ReadLine()) -ne $null) {
      if ($line -match '^CREATE TABLE(?: IF NOT EXISTS)?\s+(.+?)\s+\(') {
        [void]$tables.Add($Matches[1])
      } elseif ($line -match '^CREATE (?:OR REPLACE )?FUNCTION\s+(.+?)\(') {
        [void]$functions.Add($Matches[1])
      } elseif ($line -match '^CREATE (?:OR REPLACE )?PROCEDURE\s+(.+?)\(') {
        [void]$procedures.Add($Matches[1])
      } elseif ($line -match '^CREATE (?:OR REPLACE )?(?:MATERIALIZED )?VIEW\s+(.+?)\s+AS') {
        [void]$views.Add($Matches[1])
      } elseif ($line -match '^CREATE (?:OR REPLACE )?TRIGGER\s+(.+?)\s+(?:BEFORE|AFTER|INSTEAD)') {
        [void]$triggers.Add($Matches[1])
      } elseif ($line -match '^CREATE POLICY\s+(.+?)\s+ON\s+') {
        [void]$policies.Add($Matches[1])
      } elseif ($line -match '^CREATE (?:UNIQUE )?INDEX(?: CONCURRENTLY)?(?: IF NOT EXISTS)?\s+(.+?)\s+ON\s+(?:ONLY\s+)?(.+?)\s+') {
        $indexName = $Matches[1]
        $indexedTable = $Matches[2]
        $identifier = '(?:"(?:[^"]|"")*"|[A-Za-z_][A-Za-z0-9_$]*)'
        $qualifiedTable = [regex]::Match($indexedTable, "^(?<schema>$identifier)\.$identifier$")
        if ($qualifiedTable.Success) {
          [void]$indexes.Add($qualifiedTable.Groups["schema"].Value + "." + $indexName)
        }
      }
    }
  } finally {
    $reader.Dispose()
  }

  foreach ($dataPath in $DataPaths) {
    $currentCopy = $null
    $reader = [System.IO.File]::OpenText($dataPath)
    try {
      while (($line = $reader.ReadLine()) -ne $null) {
        if ($null -eq $currentCopy -and $line -match '^COPY\s+(.+?)\s+\(') {
          $currentCopy = $Matches[1]
          [void]$tables.Add($currentCopy)
          if (-not $rowCounts.Contains($currentCopy)) {
            $rowCounts[$currentCopy] = [long]0
          }
          continue
        }
        if ($null -ne $currentCopy) {
          if ($line -eq '\.') {
            $currentCopy = $null
          } else {
            $rowCounts[$currentCopy] = [long]$rowCounts[$currentCopy] + 1
          }
        }
      }
    } finally {
      $reader.Dispose()
    }
  }

  return [ordered]@{
    tables = @($tables | Sort-Object)
    functions = @($functions | Sort-Object)
    procedures = @($procedures | Sort-Object)
    views = @($views | Sort-Object)
    triggers = @($triggers | Sort-Object)
    policies = @($policies | Sort-Object)
    indexes = @($indexes | Sort-Object)
    rowCounts = $rowCounts
  }
}

if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
  throw "Database URL is required. Set SOURCE_DATABASE_URL or pass -DatabaseUrl. Use the percent-encoded Supabase Session Pooler/direct connection string."
}

$derivedProjectRef = Get-ProjectRefFromUrl -Url $DatabaseUrl
if ([string]::IsNullOrWhiteSpace($ProjectRef)) {
  $ProjectRef = $derivedProjectRef
}
if ([string]::IsNullOrWhiteSpace($ProjectRef)) {
  throw "Project reference could not be derived. Pass -ProjectRef explicitly."
}
if (-not [string]::IsNullOrWhiteSpace($derivedProjectRef) -and $derivedProjectRef -ne $ProjectRef) {
  throw "The supplied ProjectRef does not match the database URL."
}

$npx = Assert-Command -Name "npx" -InstallHint "Install Node.js 20+ and run npm install."
$previousErrorActionPreference = $ErrorActionPreference
try {
  # Windows PowerShell 5.1 wraps native stderr (including harmless npm warnings)
  # as ErrorRecord objects. Suppress stderr for this version probe only.
  $ErrorActionPreference = "Continue"
  $supabaseVersion = (& $npx supabase --version 2>$null | Out-String).Trim()
  $supabaseVersionExitCode = $LASTEXITCODE
} finally {
  $ErrorActionPreference = $previousErrorActionPreference
}
if ($supabaseVersionExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($supabaseVersion)) {
  throw "Supabase CLI is unavailable. Run: npm install, then npx supabase --version"
}
if (-not (Get-Command "docker" -ErrorAction SilentlyContinue) -and
    -not (Get-Command "podman" -ErrorAction SilentlyContinue)) {
  throw "Supabase CLI database dumps require Docker Desktop or Podman. Install one and ensure its command is on PATH."
}

$stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$backupDir = Join-Path $OutputRoot "$ProjectRef-$stamp"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

$rolesPath = Join-Path $backupDir "roles.sql"
$schemaPath = Join-Path $backupDir "schema.sql"
$dataPath = Join-Path $backupDir "data.sql"
$historySchemaPath = Join-Path $backupDir "history_schema.sql"
$historyDataPath = Join-Path $backupDir "history_data.sql"

try {
  Invoke-Checked -Command $npx -Description "Dumping database roles..." -Arguments @(
    "supabase", "db", "dump", "--db-url", $DatabaseUrl,
    "--file", $rolesPath, "--role-only"
  )
  Invoke-Checked -Command $npx -Description "Dumping schema, functions, procedures, triggers, and policies..." -Arguments @(
    "supabase", "db", "dump", "--db-url", $DatabaseUrl,
    "--file", $schemaPath
  )
  Invoke-Checked -Command $npx -Description "Dumping table data and Auth records..." -Arguments @(
    "supabase", "db", "dump", "--db-url", $DatabaseUrl,
    "--file", $dataPath, "--use-copy", "--data-only",
    "--exclude", "storage.*"
  )

  Assert-BackupFile -Path $rolesPath
  Assert-BackupFile -Path $schemaPath
  Assert-BackupFile -Path $dataPath

  Invoke-Checked -Command $npx -Description "Dumping Supabase migration history schema..." -Arguments @(
    "supabase", "db", "dump", "--db-url", $DatabaseUrl,
    "--file", $historySchemaPath, "--schema", "supabase_migrations"
  )
  Invoke-Checked -Command $npx -Description "Dumping Supabase migration history data..." -Arguments @(
    "supabase", "db", "dump", "--db-url", $DatabaseUrl,
    "--file", $historyDataPath, "--schema", "supabase_migrations",
    "--use-copy", "--data-only"
  )
  Assert-BackupFile -Path $historySchemaPath
  Assert-BackupFile -Path $historyDataPath

  $inventory = Get-SqlInventory -SchemaPath $schemaPath -DataPaths @($dataPath, $historyDataPath)
  $artifactNames = @("roles.sql", "schema.sql", "data.sql", "history_schema.sql", "history_data.sql")

  $artifacts = @()
  foreach ($name in $artifactNames) {
    $path = Join-Path $backupDir $name
    $item = Get-Item -LiteralPath $path
    $artifacts += [ordered]@{
      file = $name
      bytes = [long]$item.Length
      sha256 = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
    }
  }

  $psqlCommand = Get-Command "psql" -ErrorAction SilentlyContinue
  $psqlVersion = $null
  if ($psqlCommand) {
    $previousPreference = $ErrorActionPreference
    try {
      $ErrorActionPreference = "Continue"
      $psqlVersion = (& $psqlCommand.Source --version 2>$null | Out-String).Trim()
    } finally {
      $ErrorActionPreference = $previousPreference
    }
  }

  $manifest = [ordered]@{
    formatVersion = 2
    createdAtUtc = (Get-Date).ToUniversalTime().ToString("o")
    sourceProjectRef = $ProjectRef
    sourceHost = if ($DatabaseUrl -match '@([^/:?]+)') { $Matches[1] } else { "unavailable" }
    storageFilesIncluded = $false
    dumpScope = [ordered]@{
      applicationSchemaDefinitions = $true
      applicationAndAuthData = $true
      migrationHistory = $true
      storageMetadata = $false
      managedSchemaDefinitions = $false
      vaultData = $false
    }
    notes = @(
      "Storage object binaries are not included.",
      "Storage schema table data/metadata is excluded.",
      "Auth rows, including password hashes, are included by the Supabase-supported data dump.",
      "Supabase-managed schema definitions (including auth and storage) are provisioned by the target project and are not in schema.sql.",
      "Vault/pgsodium data is excluded by the Supabase CLI."
    )
    tools = [ordered]@{
      supabaseCli = $supabaseVersion
      psql = $psqlVersion
      powershell = $PSVersionTable.PSVersion.ToString()
    }
    artifacts = $artifacts
    inventory = $inventory
  }

  $manifestPath = Join-Path $backupDir "manifest.json"
  $manifest | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

  @"
# CCSHAU logical database backup

- Created (UTC): $($manifest.createdAtUtc)
- Source project: $ProjectRef
- Storage files included: No

Keep this directory private. It can contain Auth users, password hashes, and personal
data. Vault data and Storage object files are excluded. Verify it before restore with
verify-full-database.ps1.
"@ | Set-Content -LiteralPath (Join-Path $backupDir "README.md") -Encoding UTF8

  New-Item -ItemType Directory -Path $OutputRoot -Force | Out-Null
  $backupDir | Set-Content -LiteralPath (Join-Path $OutputRoot "LATEST.txt") -Encoding UTF8

  Write-Host ""
  Write-Host "Backup completed successfully."
  Write-Host "Backup directory: $backupDir"
  Write-Host "Tables inventoried: $($inventory.tables.Count)"
  Write-Host "Functions inventoried: $($inventory.functions.Count)"
  Write-Host "Storage files: excluded"
} catch {
  $failurePath = Join-Path $backupDir "BACKUP_FAILED.txt"
  $_.Exception.Message | Set-Content -LiteralPath $failurePath -Encoding UTF8
  throw
}
