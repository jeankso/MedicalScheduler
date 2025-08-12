# 📦 BACKUP E MIGRAÇÃO - ALEXANDRIA/RN

Sistema completo de backup e migração para o Sistema de Requisições de Saúde da Prefeitura Municipal de Alexandria/RN.

## 🚀 Scripts Disponíveis

### 1. `backup-database.sh` 
**Backup completo com todas as dependências**
- Backup direto do banco atual
- Mantém todas as configurações originais
- Ideal para restauração no mesmo ambiente

```bash
chmod +x backup-database.sh
./backup-database.sh
```

### 2. `backup-clean.sh` ⭐ **RECOMENDADO**
**Backup limpo para migração**
- Remove dependências específicas do Neon
- Compatível com qualquer PostgreSQL
- Ideal para migração para outro servidor

```bash
chmod +x backup-clean.sh
./backup-clean.sh
```

### 3. `verify-backup.sh`
**Verificação de integridade dos backups**
- Valida estrutura e dados
- Confirma compatibilidade para migração

```bash
chmod +x verify-backup.sh
./verify-backup.sh
```

## 📊 Última Execução (18/07/2025)

```
✅ Backup Limpo Criado: 
   📁 ./backups/alexandria_health_clean_20250718_215553.sql
   📏 Tamanho: 3.3MB
   📄 Linhas: 12,343
   🗂️  Tabelas: 10 (completas)
   📊 Formato: COPY (máxima compatibilidade)
```

## 🔄 Para Importar em Outro Servidor

### 1. **Preparar Servidor Destino**
```bash
# Instalar PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Criar banco
sudo -u postgres createdb alexandria_health

# Criar usuário
sudo -u postgres createuser -P alexandria_user
```

### 2. **Importar Backup Limpo**
```bash
# Copiar arquivo
scp alexandria_health_clean_*.sql user@servidor:/tmp/

# Importar
psql -h localhost -U alexandria_user -d alexandria_health < alexandria_health_clean_*.sql
```

### 3. **Configurar Aplicação**
```bash
# Definir DATABASE_URL
export DATABASE_URL="postgresql://alexandria_user:senha@localhost:5432/alexandria_health"

# Testar conexão
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM patients;"
```

## 📋 Dados do Sistema

| Tabela | Descrição | Registros |
|--------|-----------|-----------|
| `users` | Usuários do sistema | 11 |
| `patients` | Pacientes cadastrados | 1,310 |
| `requests` | Requisições médicas | 1,826 |
| `health_units` | Unidades de saúde | 10 |
| `exam_types` | Tipos de exames | 50+ |
| `consultation_types` | Tipos de consultas | 30+ |
| `notifications` | Notificações | - |

## 🔐 Credenciais Padrão

Após importar o backup, as credenciais de acesso são:

- **Admin Principal**: `admin` / `admin123`
- **Administrador Mayara**: `mayara` / `mayara123`

## 📁 Estrutura de Arquivos para Migração

```
sistema-alexandria/
├── 📄 backup-clean.sh              # Script de backup limpo
├── 📄 backup-database.sh           # Script de backup completo  
├── 📄 verify-backup.sh             # Script de verificação
├── 📄 INSTRUCOES_MIGRACAO_SERVIDOR.md  # Guia completo de migração
├── 📂 backups/                     # Diretório dos backups
│   └── alexandria_health_clean_*.sql   # Backup limpo para migração
├── 📂 uploads/                     # Arquivos enviados (anexos, fotos)
└── 📂 client/, server/, shared/    # Código fonte da aplicação
```

## ⚠️ Importante

1. **Use sempre o backup limpo** (`backup-clean.sh`) para migrações
2. **Copie também a pasta `uploads/`** com todos os anexos e documentos
3. **Configure corretamente a DATABASE_URL** no novo servidor
4. **Ajuste as permissões** dos arquivos de upload
5. **Teste todas as funcionalidades** após a migração

## 📞 Suporte

Para questões técnicas sobre a migração, consulte o arquivo `INSTRUCOES_MIGRACAO_SERVIDOR.md` que contém o guia completo passo a passo.

---

*Sistema de Requisições de Saúde - Prefeitura Municipal de Alexandria/RN*
*Backup gerado em: 18/07/2025 21:55:53*