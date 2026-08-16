# scripts/apply-baileys-fix.ps1
# Script de deploy para Windows

Write-Host "🚀 Aplicando correções do sistema WhatsApp/Baileys..." -ForegroundColor Green

# 1. Instalar dependências se necessário
Write-Host "📦 Verificando dependências..."
npm install fs-extra @whiskeysockets/baileys qrcode dotenv

# 2. Executar validação
Write-Host "🔍 Executando validação de arquivos..."
node scripts/validate-baileys.mjs

# 3. Reiniciar o servidor
Write-Host "♻️ Reiniciando backend..."
if (Get-Command pm2 -ErrorAction SilentlyContinue) {
    pm2 restart imobisaas-backend
    Write-Host "✅ Backend reiniciado via PM2." -ForegroundColor Green
} else {
    Write-Host "⚠️ PM2 não encontrado. Certifique-se de reiniciar o node manualmente." -ForegroundColor Yellow
}

Write-Host "`n✨ Tudo pronto! O sistema agora possui persistência resiliente e reconexão automática." -ForegroundColor Green
