#!/bin/bash

# Script para Executar no Servidor 177.87.15.68
# Sistema de Requisições de Saúde - Alexandria/RN
# Execute este script como root no servidor de destino

echo "=========================================="
echo "CONFIGURAÇÃO SERVIDOR ALEXANDRIA/RN"
echo "=========================================="
echo "Data: $(date +"%Y-%m-%d %H:%M:%S")"
echo ""

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Execute como root: sudo bash script-servidor.sh"
    exit 1
fi

echo "🚀 Iniciando configuração do servidor..."

# 1. Atualizar sistema
echo ""
echo "📦 Atualizando sistema..."
apt update -y && apt upgrade -y

# 2. Instalar PostgreSQL 14
echo ""
echo "🗄️ Instalando PostgreSQL 14..."
apt install -y postgresql-14 postgresql-contrib-14 postgresql-client-14

# 3. Instalar Node.js 20
echo ""
echo "🚀 Instalando Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 4. Instalar ferramentas essenciais
echo ""
echo "🛠️ Instalando ferramentas essenciais..."
apt install -y git nginx ufw pm2 curl wget unzip

# 5. Instalar PM2 globalmente
echo ""
echo "⚙️ Instalando PM2..."
npm install -g pm2

# 6. Configurar firewall
echo ""
echo "🔒 Configurando firewall..."
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 5000/tcp

# 7. Iniciar e habilitar PostgreSQL
echo ""
echo "▶️ Configurando PostgreSQL..."
systemctl enable postgresql
systemctl start postgresql
systemctl status postgresql --no-pager

# 8. Configurar banco de dados
echo ""
echo "🗄️ Criando banco de dados..."
sudo -u postgres psql << 'PSQLEOF'
-- Criar banco de dados
CREATE DATABASE alexandria_health;

-- Criar usuário
CREATE USER alexandria_user WITH PASSWORD 'Alexandria2025!';

-- Dar permissões
GRANT ALL PRIVILEGES ON DATABASE alexandria_health TO alexandria_user;
GRANT CREATE ON SCHEMA public TO alexandria_user;
GRANT ALL ON SCHEMA public TO alexandria_user;
ALTER DATABASE alexandria_health OWNER TO alexandria_user;

-- Confirmar criação
\l alexandria_health
\du alexandria_user

\q
PSQLEOF

# 9. Configurar autenticação PostgreSQL
echo ""
echo "🔐 Configurando autenticação PostgreSQL..."
echo "local   alexandria_health   alexandria_user   md5" >> /etc/postgresql/14/main/pg_hba.conf
echo "host    alexandria_health   alexandria_user   127.0.0.1/32   md5" >> /etc/postgresql/14/main/pg_hba.conf

# Reiniciar PostgreSQL para aplicar mudanças
systemctl restart postgresql

# 10. Testar conexão
echo ""
echo "🧪 Testando conexão com banco..."
export PGPASSWORD='Alexandria2025!'
psql -h localhost -U alexandria_user -d alexandria_health -c "SELECT 'Conexão OK!' AS status, current_database(), current_user;"

# 11. Criar estrutura de diretórios
echo ""
echo "📁 Criando estrutura de diretórios..."
mkdir -p /opt/alexandria-health
mkdir -p /opt/alexandria-health/uploads
mkdir -p /opt/alexandria-health/backups
chmod 755 /opt/alexandria-health
chmod 777 /opt/alexandria-health/uploads

# 12. Configurar environment
echo ""
echo "🔧 Criando arquivo .env..."
cat > /opt/alexandria-health/.env << 'ENVEOF'
NODE_ENV=production
PORT=5000
DATABASE_URL="postgresql://alexandria_user:Alexandria2025!@localhost:5432/alexandria_health"
SESSION_SECRET="Alexandria_Health_Secret_2025_$(openssl rand -hex 32)"
ENVEOF

chmod 600 /opt/alexandria-health/.env

# 13. Criar script de importação do backup
echo ""
echo "📥 Criando script de importação..."
cat > /opt/alexandria-health/import-backup.sh << 'IMPORTEOF'
#!/bin/bash

echo "=== IMPORTAÇÃO DO BACKUP ==="

# Procurar arquivo de backup
BACKUP_FILE=$(find /tmp /opt/alexandria-health -name "alexandria_health_clean_*.sql" 2>/dev/null | head -n1)

if [ -z "$BACKUP_FILE" ]; then
    echo "❌ Arquivo de backup não encontrado!"
    echo "Copie o backup para /tmp/ e execute novamente"
    echo "Exemplo: scp alexandria_health_clean_*.sql root@177.87.15.68:/tmp/"
    exit 1
fi

echo "✅ Backup encontrado: $BACKUP_FILE"

# Importar backup
echo "📥 Importando dados..."
export PGPASSWORD='Alexandria2025!'
psql -h localhost -U alexandria_user -d alexandria_health < "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Backup importado com sucesso!"
    
    # Verificar dados
    echo ""
    echo "🔍 Verificando dados importados..."
    psql -h localhost -U alexandria_user -d alexandria_health << 'VERIFYEOF'
SELECT 'Usuários' AS tabela, COUNT(*) AS registros FROM users
UNION ALL
SELECT 'Pacientes' AS tabela, COUNT(*) AS registros FROM patients  
UNION ALL
SELECT 'Requisições' AS tabela, COUNT(*) AS registros FROM requests
UNION ALL
SELECT 'Unidades de Saúde' AS tabela, COUNT(*) AS registros FROM health_units
UNION ALL  
SELECT 'Tipos de Exames' AS tabela, COUNT(*) AS registros FROM exam_types
UNION ALL
SELECT 'Tipos de Consultas' AS tabela, COUNT(*) AS registros FROM consultation_types;
VERIFYEOF
    
else
    echo "❌ Erro ao importar backup!"
    exit 1
fi
IMPORTEOF

chmod +x /opt/alexandria-health/import-backup.sh

# 14. Criar script de configuração da aplicação
echo ""
echo "🚀 Criando script de deploy da aplicação..."
cat > /opt/alexandria-health/deploy-app.sh << 'DEPLOYEOF'
#!/bin/bash

echo "=== DEPLOY DA APLICAÇÃO ==="

cd /opt/alexandria-health

# Clonar ou atualizar código (substitua pela URL do seu repositório)
if [ ! -d "sistema-alexandria" ]; then
    echo "📥 Clonando repositório..."
    # git clone https://github.com/seu-usuario/sistema-alexandria.git
    echo "❗ Configure o repositório Git e descomente a linha acima"
else
    echo "🔄 Atualizando código..."
    cd sistema-alexandria
    git pull
    cd ..
fi

# Instalar dependências
echo "📦 Instalando dependências..."
cd sistema-alexandria
npm install --production

# Compilar aplicação
echo "🏗️ Compilando aplicação..."
npm run build

# Configurar PM2
echo "⚙️ Configurando PM2..."
cat > ecosystem.config.js << 'PM2EOF'
module.exports = {
  apps: [{
    name: 'alexandria-health',
    script: 'server/index.js',
    cwd: '/opt/alexandria-health/sistema-alexandria',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      DATABASE_URL: 'postgresql://alexandria_user:Alexandria2025!@localhost:5432/alexandria_health'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
}
PM2EOF

# Parar aplicação se estiver rodando
pm2 stop alexandria-health 2>/dev/null || true

# Iniciar aplicação
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo "✅ Aplicação configurada!"
echo "🌐 Acesse: http://177.87.15.68:5000"
DEPLOYEOF

chmod +x /opt/alexandria-health/deploy-app.sh

# 15. Configurar Nginx (opcional)
echo ""
echo "🌐 Configurando Nginx..."
cat > /etc/nginx/sites-available/alexandria-health << 'NGINXEOF'
server {
    listen 80;
    server_name 177.87.15.68;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINXEOF

# Habilitar site
ln -sf /etc/nginx/sites-available/alexandria-health /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo ""
echo "=========================================="
echo "✅ CONFIGURAÇÃO CONCLUÍDA!"
echo "=========================================="
echo ""
echo "🎯 Servidor configurado com sucesso!"
echo "🗄️ PostgreSQL 14 instalado e rodando"
echo "🚀 Node.js 20 instalado"
echo "📊 Banco 'alexandria_health' criado"
echo "👤 Usuário 'alexandria_user' configurado"
echo "🔒 Firewall configurado"
echo "🌐 Nginx configurado"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "1. 📥 IMPORTAR BACKUP:"
echo "   - Copie o backup: scp alexandria_health_clean_*.sql root@177.87.15.68:/tmp/"
echo "   - Execute: /opt/alexandria-health/import-backup.sh"
echo ""
echo "2. 🚀 DEPLOY DA APLICAÇÃO:"
echo "   - Copie o código fonte para o servidor"
echo "   - Execute: /opt/alexandria-health/deploy-app.sh"
echo ""
echo "3. 🌐 ACESSAR SISTEMA:"
echo "   - URL: http://177.87.15.68"
echo "   - Admin: admin / admin123"
echo ""
echo "🔗 DATABASE_URL configurada:"
echo "postgresql://alexandria_user:Alexandria2025!@localhost:5432/alexandria_health"
echo ""
echo "✅ Servidor pronto para receber a aplicação!"