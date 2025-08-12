const fs = require('fs');

// Ler o arquivo
const content = fs.readFileSync('client/src/pages/RegistrarPanel.tsx', 'utf8');
const lines = content.split('\n');

// Remover as seções de miniaturas
let result = [];
let skipLines = false;
let skipUntilLine = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const lineNum = i + 1;
  
  // Detectar início da seção de miniatura
  if (line.includes('Image thumbnail if attachment exists')) {
    skipLines = true;
    // Pular até encontrar o final da seção Dialog
    continue;
  }
  
  // Se estamos pulando e encontramos o final da seção
  if (skipLines && line.includes('})}')) {
    skipLines = false;
    continue;
  }
  
  // Se não estamos pulando, adicionar a linha
  if (!skipLines) {
    result.push(line);
  }
}

// Escrever o arquivo modificado
fs.writeFileSync('client/src/pages/RegistrarPanel.tsx', result.join('\n'));

console.log('✅ Miniaturas removidas com sucesso');