# Sistema de Requisições de Saúde - Alexandria/RN

Sistema completo para gerenciamento de requisições de exames e consultas médicas desenvolvido para a Prefeitura Municipal de Alexandria/RN.

## Instalação Rápida

### Pré-requisitos
- Servidor Ubuntu 20.04+ ou Debian 11+
- Acesso SSH como usuário com privilégios sudo
- Mínimo 2GB RAM e 10GB de espaço livre

### Instalação Automática

```bash
git clone <URL_DO_REPOSITORIO>
cd health-system
chmod +x install-safe.sh
./install-safe.sh
```

**Se a aplicação não iniciar após instalação:**
```bash
./quick-fix.sh
```

**Verificação completa:**
```bash
./verify-installation.sh
```

### Primeiro Acesso

1. Acesse: `http://SEU_IP_SERVIDOR`
2. Login: `admin` / `admin123`
3. **Altere a senha imediatamente**

## Funcionalidades Principais

### Usuários do Sistema
- **Administrador**: Gerenciamento completo do sistema
- **Recepção UBS**: Cadastro de requisições e pacientes
- **Setor Regulação**: Aprovação e gerenciamento de requisições

### Recursos
- ✅ Cadastro de pacientes com CPF
- ✅ Requisições de exames e consultas
- ✅ Sistema de aprovação por secretaria
- ✅ Controle de cotas mensais
- ✅ Upload de documentos e resultados
- ✅ Geração de PDFs para requisições
- ✅ Consulta pública por CPF
- ✅ Dashboard com relatórios
- ✅ Log de atividades completo
- ✅ Backup automático

## Gerenciamento do Sistema

### Comandos Básicos
```bash
# Status dos serviços
sudo systemctl status health-system
sudo systemctl status postgresql
sudo systemctl status nginx

# Visualizar logs
sudo journalctl -u health-system -f

# Reiniciar serviços
sudo systemctl restart health-system

# Backup manual
sudo /usr/local/bin/backup-health-system.sh

# Manutenção do sistema
sudo /usr/local/bin/health-system-maintenance.sh
```

### Configuração de SSL (Produção)
```bash
# Instalar certificado SSL gratuito
sudo certbot --nginx

# Verificar renovação automática
sudo certbot renew --dry-run
```

## Estrutura do Projeto

```
├── client/                 # Frontend React
├── server/                 # Backend Node.js
├── shared/                 # Schemas compartilhados
├── uploads/                # Arquivos enviados
├── install.sh              # Instalador automático
├── production-config.sh    # Configuração de produção
├── verify-installation.sh  # Verificação do sistema
└── README-INSTALACAO.md    # Manual completo
```

## Configuração Inicial

### 1. Criar Unidades de Saúde
Acesse "Gerenciar Unidades" e cadastre:
- SMS Alexandria (Secretaria Municipal)
- UBS Centro
- UBS Rural
- Outras unidades conforme necessário

### 2. Criar Usuários
Para cada unidade, criar usuários com os perfis:
- **recepcao**: Para atendentes das UBS
- **regulacao**: Para equipe da SMS
- **admin**: Para administradores

### 3. Configurar Tipos de Exames
Cadastre os exames disponíveis em "Gerenciar Exames":
- Hemograma, Glicemia, Colesterol, etc.
- Defina cotas mensais para cada tipo
- Configure se requer aprovação da secretaria

### 4. Configurar Tipos de Consultas
Cadastre as consultas em "Gerenciar Consultas":
- Cardiologia, Endocrinologia, etc.
- Defina cotas mensais
- Configure aprovação se necessário

## Fluxo de Trabalho

1. **Recepção UBS**: Cadastra paciente e cria requisição
2. **Sistema**: Verifica se requer aprovação da secretaria
3. **Secretaria**: Aprova/rejeita requisições (se necessário)
4. **Regulação**: Aceita requisição e agenda
5. **Regulação**: Confirma agendamento com dados
6. **Regulação**: Finaliza com resultado do exame

## Backup e Segurança

### Backup Automático
- Backup diário às 2h da manhã
- Mantém 7 dias de histórico
- Inclui banco de dados e arquivos

### Monitoramento
- Verificação a cada 5 minutos
- Logs de atividade detalhados
- Alertas de uso de recursos

### Segurança
- Firewall configurado (UFW)
- Fail2ban para proteção SSH
- Headers de segurança no Nginx
- Logs de auditoria completos

## Solução de Problemas

### Erro "Cannot find module" / "MODULE_NOT_FOUND"
Este é o erro mais comum após instalação. Execute:
```bash
./fix-module-error.sh
```

### Aplicação não responde
```bash
sudo systemctl restart health-system
sudo journalctl -u health-system -n 50
```

### Problema no banco
```bash
sudo systemctl status postgresql
sudo -u postgres psql -l
```

### Erro de permissão
```bash
sudo chown -R healthapp:healthapp /opt/health-system/
sudo chmod -R 755 /opt/health-system/uploads/
```

### Build falhando
```bash
cd /opt/health-system
sudo -u healthapp npm cache clean --force
sudo -u healthapp npm install
sudo -u healthapp npm run build
```

## Suporte

Para suporte técnico:
1. Verificar logs primeiro
2. Executar script de verificação
3. Documentar erro específico
4. Incluir informações do sistema

## Atualizações

```bash
# Backup antes da atualização
sudo /usr/local/bin/backup-health-system.sh

# Atualizar código
cd /opt/health-system
sudo -u healthapp git pull
sudo -u healthapp npm install

# Executar migrações
sudo -u healthapp npm run db:push

# Reiniciar aplicação
sudo systemctl restart health-system
```

## Licença

Sistema desenvolvido exclusivamente para a Prefeitura Municipal de Alexandria/RN.

## Documentação Completa

Para instruções detalhadas, consulte:
- `README-INSTALACAO.md` - Manual completo de instalação
- `production-config.sh` - Configurações avançadas de produção
- `verify-installation.sh` - Script de verificação do sistema