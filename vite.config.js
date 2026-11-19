import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/** Preenche o sw.js com a lista de arquivos do site, para o app funcionar offline. */
function listaOffline() {
  let saida = 'dist';
  return {
    name: 'lista-offline',
    apply: 'build',
    configResolved: (c) => (saida = c.build.outDir),
    closeBundle() {
      const arquivos = [];
      const andar = (dir) =>
        readdirSync(dir).forEach((nome) => {
          const caminho = join(dir, nome);
          if (statSync(caminho).isDirectory()) return andar(caminho);
          arquivos.push(caminho);
        });
      andar(saida);
      const hash = createHash('sha1');
      const urls = arquivos
        .map((a) => {
          hash.update(readFileSync(a));
          return '/' + relative(saida, a).split('\\').join('/');
        })
        .filter((u) => !['/sw.js', '/robots.txt', '/vercel.json'].includes(u))
        .map((u) => (u === '/index.html' ? '/' : u));
      const sw = join(saida, 'sw.js');
      const cabecalho = `self.__ARQUIVOS__ = ${JSON.stringify(urls)};\nself.__VERSAO__ = '${hash.digest('hex').slice(0, 10)}';\n`;
      writeFileSync(sw, cabecalho + readFileSync(sw, 'utf8'));
    },
  };
}

/*
 * npm run build    → site normal em dist/ (para hospedar, se um dia quiser)
 * npm run arquivo  → UM único arquivo em dist-arquivo/clinica-dra-lara.html,
 *                    com fotos, animações e fontes dentro; abre sem internet.
 */
export default defineConfig(({ mode }) => {
  const arquivo = mode === 'arquivo';
  return {
    server: { host: true }, // permite abrir no celular pela mesma rede Wi-Fi
    publicDir: arquivo ? false : 'public',
    plugins: arquivo
      ? [
          viteSingleFile({ removeViteModuleLoader: true }),
          {
            name: 'arquivo-unico-sem-links-externos',
            // O arquivo único não tem manifest nem ícones separados.
            transformIndexHtml: (html) =>
              html
                .replace(/\s*<link rel="(icon|apple-touch-icon|manifest)"[^>]*>/g, '')
                .replace('<html lang="pt-BR">', '<html lang="pt-BR" data-arquivo>'),
          },
        ]
      : [listaOffline()],
    build: {
      target: 'es2020',
      chunkSizeWarningLimit: 4000,
      outDir: arquivo ? 'dist-arquivo' : 'dist',
      ...(arquivo && { assetsInlineLimit: Number.MAX_SAFE_INTEGER }),
    },
  };
});
