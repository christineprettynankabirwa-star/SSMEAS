[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($env:DATABASE_URL)) {
    throw 'DATABASE_URL is required. Set it to the deployed PostgreSQL connection URL before running this seed.'
}

$scriptPath = Join-Path $PSScriptRoot 'seed_live_presentation_demo.sql'
$psql = Get-Command psql -ErrorAction SilentlyContinue
if ($null -eq $psql) {
    throw 'PostgreSQL psql was not found on PATH. Install the PostgreSQL client, then run this script again.'
}

& $psql.Source $env:DATABASE_URL '-v' 'ON_ERROR_STOP=1' '-f' $scriptPath
if ($LASTEXITCODE -ne 0) {
    throw "Demo seed failed with psql exit code $LASTEXITCODE. The transaction was rolled back."
}

Write-Host 'SSMEAS presentation demo data seeded successfully.'
