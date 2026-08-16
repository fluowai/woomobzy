$ErrorActionPreference = "Stop"
$env:IMOBZY_E2E_RURAL_ADMIN_EMAIL = "admin-rural-a@imobzy.test"
$env:IMOBZY_E2E_RURAL_ADMIN_PASSWORD = "imobzyOnda0!"

Write-Host "Iniciando servidor backend (API)..." -ForegroundColor Cyan
$serverProcess = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "server" -PassThru -WindowStyle Hidden -RedirectStandardOutput "backend.log" -RedirectStandardError "backend_err.log"
Start-Sleep -Seconds 5

try {
    Write-Host "Iniciando bateria de testes Onda 2 (Rural)..." -ForegroundColor Cyan

    Write-Host "`n[1/2] Executando testes de Cadastro de Fazendas..." -ForegroundColor Yellow
    npx playwright test onda2-fazendas.spec.ts --project=chromium

    Write-Host "`n[2/2] Executando testes de Localizacao de CAR..." -ForegroundColor Yellow
    npx playwright test onda2-car.spec.ts --project=chromium

    Write-Host "`nBateria da Onda 2 finalizada!" -ForegroundColor Green
} finally {
    Write-Host "Encerrando servidor backend..." -ForegroundColor Cyan
    Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
}
