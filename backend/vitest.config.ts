import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const raiz = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    // Mesmo alias do tsconfig — os testes importam o código como ele se importa.
    alias: { '@': resolve(raiz, 'src') },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    // Um banco só, compartilhado: rodar arquivos em paralelo faria um truncar a
    // tabela que o outro acabou de popular.
    fileParallelism: false,
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
});
