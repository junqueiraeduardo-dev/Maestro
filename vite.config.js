import { defineConfig } from 'vite';

export default defineConfig({
  server: { host: true }, // permite abrir no celular pela mesma rede Wi-Fi
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 700,
  },
});
