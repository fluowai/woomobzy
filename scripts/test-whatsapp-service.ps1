$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$source = Join-Path $repoRoot 'whatsapp-service'
$target = Join-Path 'C:\tmp' ("imobzy-whatsapp-test-{0}" -f $PID)

if (-not (Test-Path $source)) {
  Write-Error "whatsapp-service nao encontrado em $source"
}

New-Item -ItemType Directory -Force -Path $target | Out-Null

robocopy $source $target /MIR /XD .gocache .gocache-phone /XF whatsapp-service-bin | Out-Null
$copyExit = $LASTEXITCODE
if ($copyExit -gt 7) {
  Write-Error "Falha ao espelhar whatsapp-service para $target (robocopy exit $copyExit)"
}

Push-Location $target
try {
  go test ./...
  exit $LASTEXITCODE
} finally {
  Pop-Location
  Remove-Item -LiteralPath $target -Recurse -Force -ErrorAction SilentlyContinue
}
