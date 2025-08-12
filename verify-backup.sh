#!/bin/bash

# Script de Verificação de Backup
# Sistema de Requisições de Saúde - Alexandria/RN

set -e

echo "=========================================="
echo "VERIFICAÇÃO DE BACKUP - ALEXANDRIA/RN"
echo "=========================================="
echo "Data: $(date +"%Y-%m-%d %H:%M:%S")"
echo ""

# Encontrar o backup mais recente
BACKUP_DIR="./backups"
if [ ! -d "$BACKUP_DIR" ]; then
    echo "❌ Diretório de backup não encontrado: $BACKUP_DIR"
    exit 1
fi

LATEST_BACKUP=$(ls -t "${BACKUP_DIR}"/alexandria_health_clean_*.sql 2>/dev/null | head -n1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "❌ Nenhum backup limpo encontrado!"
    echo "Execute primeiro: ./backup-clean.sh"
    exit 1
fi

echo "Verificando backup: $LATEST_BACKUP"
echo ""

# Verificar se o arquivo existe e não está vazio
if [ ! -s "$LATEST_BACKUP" ]; then
    echo "❌ Arquivo de backup está vazio ou não existe!"
    exit 1
fi

# Mostrar informações do arquivo
FILE_SIZE=$(du -h "$LATEST_BACKUP" | cut -f1)
LINE_COUNT=$(wc -l < "$LATEST_BACKUP")

echo "✅ Informações do Backup:"
echo "   Arquivo: $LATEST_BACKUP"
echo "   Tamanho: $FILE_SIZE"
echo "   Linhas: $LINE_COUNT"
echo ""

# Verificar conteúdo essencial
echo "🔍 Verificando conteúdo essencial..."

TABLES_FOUND=0
ESSENTIAL_TABLES=("users" "patients" "requests" "health_units" "exam_types" "consultation_types")

for table in "${ESSENTIAL_TABLES[@]}"; do
    if grep -q "CREATE TABLE.*$table" "$LATEST_BACKUP"; then
        echo "   ✅ Tabela '$table' encontrada"
        ((TABLES_FOUND++))
    else
        echo "   ❌ Tabela '$table' NÃO encontrada"
    fi
done

echo ""

# Verificar dados essenciais
echo "🔍 Verificando dados essenciais..."

if grep -q "INSERT INTO.*users" "$LATEST_BACKUP"; then
    USER_COUNT=$(grep -c "INSERT INTO.*users" "$LATEST_BACKUP" || echo "0")
    echo "   ✅ Usuários: $USER_COUNT registros"
else
    echo "   ❌ Nenhum dado de usuários encontrado"
fi

if grep -q "INSERT INTO.*patients" "$LATEST_BACKUP"; then
    PATIENT_COUNT=$(grep -c "INSERT INTO.*patients" "$LATEST_BACKUP" || echo "0")
    echo "   ✅ Pacientes: $PATIENT_COUNT registros"
else
    echo "   ❌ Nenhum dado de pacientes encontrado"
fi

if grep -q "INSERT INTO.*requests" "$LATEST_BACKUP"; then
    REQUEST_COUNT=$(grep -c "INSERT INTO.*requests" "$LATEST_BACKUP" || echo "0")
    echo "   ✅ Requisições: $REQUEST_COUNT registros"
else
    echo "   ❌ Nenhum dado de requisições encontrado"
fi

echo ""

# Verificar se não há referências específicas do Neon
echo "🔍 Verificando limpeza (sem dependências Neon)..."

if grep -qi "neon" "$LATEST_BACKUP"; then
    echo "   ⚠️  Aviso: Referências 'neon' encontradas no backup"
    NEON_COUNT=$(grep -ci "neon" "$LATEST_BACKUP")
    echo "      Total de ocorrências: $NEON_COUNT"
else
    echo "   ✅ Backup limpo - nenhuma referência Neon encontrada"
fi

if grep -q "ep-sparkling-hat" "$LATEST_BACKUP"; then
    echo "   ❌ Referências específicas do servidor Neon encontradas"
else
    echo "   ✅ Nenhuma referência específica do servidor encontrada"
fi

echo ""

# Resumo final
echo "=========================================="
echo "RESULTADO DA VERIFICAÇÃO"
echo "=========================================="

if [ $TABLES_FOUND -eq ${#ESSENTIAL_TABLES[@]} ]; then
    echo "✅ BACKUP VÁLIDO"
    echo "   - Todas as tabelas essenciais presentes"
    echo "   - Dados encontrados"
    echo "   - Arquivo pronto para importação"
    echo ""
    echo "📋 Instruções para usar o backup:"
    echo "   1. Copiar arquivo para servidor de destino"
    echo "   2. Criar banco: CREATE DATABASE alexandria_health;"
    echo "   3. Importar: psql -d alexandria_health < $(basename "$LATEST_BACKUP")"
    echo ""
else
    echo "❌ BACKUP INCOMPLETO"
    echo "   - Faltam $(( ${#ESSENTIAL_TABLES[@]} - TABLES_FOUND )) tabelas essenciais"
    echo "   - Execute novamente o backup-clean.sh"
fi

echo "Verificação concluída."