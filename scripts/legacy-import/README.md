# Legacy MySQL → CCSHAU import

## Policy (agreed)

1. **Dry-run first** — reads `hau_db`, writes a report only  
2. **No live writes** until you explicitly approve “import to live”  
3. Hindi fields empty on first pass  
4. Upload files required from client before attachments can be imported  

## Setup

```bash
cd scripts/legacy-import
npm install
```

## Dry-run

```bash
npm run dry-run
```

Optional env:

```bash
set LEGACY_MYSQL_HOST=127.0.0.1
set LEGACY_MYSQL_DATABASE=hau_db
set LEGACY_UPLOADS_ROOT=C:\path\to\uploads
npm run dry-run
```

Reports are written to `scripts/legacy-import/reports/dry-run-latest.md`.

## Live apply

Not implemented yet on purpose. After dry-run review + client files, we will add a separate apply script that requires an explicit confirmation flag.
