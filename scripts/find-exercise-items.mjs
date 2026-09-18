import fs from 'fs';

const content = fs.readFileSync('realmap11/data/items/items.xml', 'utf8');
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.toLowerCase().includes('exercise')) {
    console.log(i + 1, line.trim());
  }
}
