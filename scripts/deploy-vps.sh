#!/usr/bin/env bash
set -e

echo "=================================================="
echo "🚀 Instalando e Iniciando o CAVEBOUND / TIBIAWEB"
echo "=================================================="

# 1. Atualizar pacotes do sistema
apt-get update -y
apt-get install -y curl git ufw

# 2. Instalar Node.js 22 LTS caso não esteja presente
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d'.' -f1)" != "v22" ]; then
  echo "📦 Instalando Node.js 22 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo "✅ Node.js $(node -v) e NPM $(npm -v) prontos."

# 3. Clonar ou atualizar o repositório do GitHub
APP_DIR="/root/tibia-idle"
if [ -d "$APP_DIR/.git" ]; then
  echo "🔄 Atualizando repositório existente em $APP_DIR..."
  cd "$APP_DIR"
  git fetch origin main
  git reset --hard origin/main
else
  echo "📥 Clonando repositório do GitHub..."
  cd /root
  rm -rf "$APP_DIR"
  git clone https://github.com/Tarnaph/tibia-idle.git "$APP_DIR"
  cd "$APP_DIR"
fi

# 4. Instalar dependências
echo "📦 Instalando dependências npm..."
npm install

# 4.1 Configurar variáveis de ambiente (.env)
echo "🔑 Configurando arquivo .env..."
cat << 'EOF' > "$APP_DIR/.env"
DATABASE_URL="file:./dev.db"
JWT_SECRET="cavebound-jwt-secret-secure-prod-auth-key-2026"
NEXT_PUBLIC_SITE_URL="http://187.7.16.210:3000"
EOF

export DATABASE_URL="file:./dev.db"
export JWT_SECRET="cavebound-jwt-secret-secure-prod-auth-key-2026"
export NEXT_PUBLIC_SITE_URL="http://187.7.16.210:3000"

# 5. Configurar banco de dados Prisma SQLite
echo "🗄️ Inicializando banco de dados Prisma..."
npx prisma generate
npx prisma db push --accept-data-loss

# 6. Preparar assets e conteúdo do jogo
echo "🎨 Gerando catálogos e assets do jogo..."
npm run prepare:game

# 7. Instalar PM2 para rodar os servidores 24/7 em segundo plano
if ! command -v pm2 >/dev/null 2>&1; then
  echo "📦 Instalando PM2..."
  npm install -g pm2
fi

# 8. Encerrar instâncias antigas se houver
pm2 delete all || true

# 9. Iniciar Servidor Colyseus (porta 2567) e Servidor Web (porta 3000)
echo "🚀 Iniciando Servidor Colyseus (Game Engine)..."
pm2 start "npx tsx packages/server/src/cli.ts" --name "colyseus-server"

echo "🌐 Iniciando Servidor Web (Next/Vinext)..."
pm2 start "npx vinext dev --port 3000" --name "tibia-web"

pm2 save
pm2 startup systemd -u root --hp /root || true

# 10. Liberar portas no firewall do Linux
echo "🛡️ Liberando portas 3000 (Web) e 2567 (Colyseus)..."
ufw allow 3000/tcp || true
ufw allow 2567/tcp || true
ufw allow 22/tcp || true

echo ""
echo "=================================================="
echo "🎉 CAVEBOUND / TIBIAWEB ESTÁ ONLINE!"
echo "=================================================="
echo "👉 Acesse o jogo no seu navegador:"
echo "   http://$(curl -s ifconfig.me):3000/game"
echo "=================================================="
