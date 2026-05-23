Param(
  [string]$SeedBaseDate = "2026-01-01T00:00:00.000Z",
  [string]$AdminPassword = "admin123",
  [string]$UserPassword = "123456",
  [switch]$RunDemoTests
)

$ErrorActionPreference = "Stop"

Write-Host "== Full Demo Setup =="
Write-Host "SEED_BASE_DATE: $SeedBaseDate"

$env:SEED_BASE_DATE = $SeedBaseDate
$env:DEMO_ADMIN_PASSWORD = $AdminPassword
$env:DEMO_SEED_PASSWORD = $UserPassword

Write-Host "`n[1/4] Prisma migrate all..."
npm run prisma:migrate:all

Write-Host "`n[2/4] Prisma seed all..."
npm run prisma:seed:all

Write-Host "`n[3/4] Build backend..."
npm run build

if ($RunDemoTests) {
  Write-Host "`n[4/4] Run demo tests..."
  npm run test:demo
} else {
  Write-Host "`n[4/4] Skip demo tests (use -RunDemoTests to enable)."
}

Write-Host "`nDone. Full demo data is ready."
Write-Host "Admin: admin / $AdminPassword"
Write-Host "Other users: */ $UserPassword"
