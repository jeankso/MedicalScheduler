const fs = require('fs');

// Ler o arquivo
const content = fs.readFileSync('client/src/pages/RegistrarPanel.tsx', 'utf8');
const lines = content.split('\n');

let result = [];
let skipFirst = false;
let skipSecond = false;
let braceCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const lineNum = i + 1;
  
  // Primeira seção (linha 590)
  if (lineNum === 590 && line.includes('Image thumbnail if attachment exists')) {
    skipFirst = true;
    braceCount = 0;
    continue;
  }
  
  // Segunda seção (linha 739)
  if (lineNum === 739 && line.includes('Image thumbnail if attachment exists')) {
    skipSecond = true;
    braceCount = 0;
    continue;
  }
  
  // Contar chaves quando estamos pulando
  if (skipFirst || skipSecond) {
    // Contar chaves abertas
    const openBraces = (line.match(/{/g) || []).length;
    const closeBraces = (line.match(/}/g) || []).length;
    braceCount += openBraces - closeBraces;
    
    // Se chegamos ao final da estrutura (braceCount volta para 0 ou negativo), paramos de pular
    if (braceCount <= 0 && (line.includes('})}') || line.includes('}') && line.trim().endsWith('}'))) {
      skipFirst = false;
      skipSecond = false;
      continue;
    }
    continue;
  }
  
  // Se não estamos pulando, adicionar a linha
  result.push(line);
}

// Escrever o arquivo modificado
fs.writeFileSync('client/src/pages/RegistrarPanel.tsx', result.join('\n'));

console.log('✅ Duas seções de miniaturas removidas com sucesso (linhas 590 e 739)');