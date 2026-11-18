// Dá um nome amigável ao arquivo único gerado por `npm run arquivo`.
import { renameSync, statSync } from 'node:fs';

const destino = 'dist-arquivo/clinica-dra-lara.html';
renameSync('dist-arquivo/index.html', destino);
console.log(`Pronto: ${destino} (${(statSync(destino).size / 1024 / 1024).toFixed(1)} MB)`);
