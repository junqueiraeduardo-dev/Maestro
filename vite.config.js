import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

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
      : [],
    build: {
      target: 'es2020',
      chunkSizeWarningLimit: 4000,
      outDir: arquivo ? 'dist-arquivo' : 'dist',
      ...(arquivo && { assetsInlineLimit: Number.MAX_SAFE_INTEGER }),
    },
  };
});
