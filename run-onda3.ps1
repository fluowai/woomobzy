$ErrorActionPreference = "Stop"

Write-Host "Iniciando bateria de testes Onda 3 (Super Admin & Mega Admin)..." -ForegroundColor Magenta

# Garantir variáveis de ambiente para testes
$env:NODE_ENV = "test"

# Opcional: Senhas de login, se usadas (são as mesmas do seed_audit_onda0)
$env:IMOBZY_E2E_SUPER_ADMIN_EMAIL = "superadmin@imobzy.test"
$env:IMOBZY_E2E_SUPER_ADMIN_PASSWORD = "imobzyOnda0!"
$env:IMOBZY_E2E_MEGA_ADMIN_EMAIL = "megaadmin@imobzy.test"
$env:IMOBZY_E2E_MEGA_ADMIN_PASSWORD = "imobzyOnda0!"

# Super Admin e Mega Admin quase não dependem do servidor local node porque eles apenas leem e escrevem dados administrativos usando Supabase e React-Router.
# Mas vamos ligar o backend Node para garantir que não dê erros de proxy.
Write-Host "Iniciando servidor backend (API)..." -ForegroundColor Cyan
$serverProcess = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "server" -PassThru -WindowStyle Hidden -RedirectStandardOutput "backend_onda3.log" -RedirectStandardError "backend_err_onda3.log"
Start-Sleep -Seconds 5

try {
    Write-Host "`n[1/2] Executando testes de Super Admin..." -ForegroundColor Yellow
    npx playwright test onda3-super-admin.spec.ts --project=chromium

    Write-Host "`n[2/2] Executando testes de Mega Admin..." -ForegroundColor Yellow
    npx playwright test onda3-mega-admin.spec.ts --project=chromium

    Write-Host "`nBateria da Onda 3 finalizada!" -ForegroundColor Green
}
finally {
    Write-Host "Encerrando servidor backend..." -ForegroundColor Cyan
    Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
}
