param(
  [string]$TempDir = "",
  [string]$GoToolchain = "go1.25.0"
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$source = Join-Path $repoRoot "whatsapp-service"

if ([string]::IsNullOrWhiteSpace($TempDir)) {
  $TempDir = Join-Path $repoRoot "scratch\imobzy-whatsapp-service-build-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
}

if (!(Test-Path -LiteralPath $source)) {
  throw "whatsapp-service directory not found at $source"
}

Write-Host "Preparing temporary Go workspace at $TempDir"
[System.IO.Directory]::CreateDirectory($TempDir) | Out-Null
Get-ChildItem -LiteralPath $source -Force | Copy-Item -Destination $TempDir -Recurse -Force
Set-Location -LiteralPath $TempDir

$env:GO111MODULE = "on"
$env:GOTOOLCHAIN = $GoToolchain
$env:GOCACHE = Join-Path $repoRoot "scratch\go-build-cache-imobzy-$($GoToolchain -replace '[^a-zA-Z0-9._-]', '-')"

Write-Host "Running Go validation from $TempDir"
Write-Host "GOTOOLCHAIN=$env:GOTOOLCHAIN"
Write-Host "GOCACHE=$env:GOCACHE"

go test ./...
go build ./cmd/server
