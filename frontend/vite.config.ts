import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')) as {
  version: string;
};

/**
 * O commit de onde este bundle saiu.
 *
 * A versão do package.json não muda a cada publicação, e a data do build só
 * responde "quando", não "o quê". Depois de publicar, a pergunta que aparece é
 * sempre a mesma — "a alteração está no ar?" — e sem o commit ela só se
 * responde comparando telas, que é adivinhação. Com ele, basta abrir "Sobre o
 * sistema" e conferir com o `git log`.
 *
 * Vazio quando o build roda fora de um repositório (tarball, container sem
 * .git): a tela simplesmente omite a linha, em vez de quebrar o build.
 */
function commitAtual(): string {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: __dirname, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return '';
  }
}

export default defineConfig({
  plugins: [react()],
  // Versão e data do build viram constantes no bundle: a tela "Sobre" mostra
  // exatamente o que está publicado, sem depender de chamada à API.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
    __APP_COMMIT__: JSON.stringify(commitAtual()),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        /*
         * React e o roteador num pedaço à parte.
         *
         * Não é para o primeiro acesso — é para todos os outros. Essas
         * bibliotecas mudam quando se atualiza uma dependência, e o código do
         * sistema muda toda semana; juntos, cada publicação invalida o cache
         * dos dois. Separados, quem já usou o sistema baixa só o que mudou.
         *
         * Os ícones ficam de fora de propósito: o `lucide-react` é
         * árvore-sacudível e cada tela puxa os seus, então prendê-lo aqui
         * traria o conjunto inteiro para o primeiro acesso — o oposto do que
         * a divisão por rota acabou de fazer.
         */
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Encaminha chamadas de API para o backend em desenvolvimento.
      '/api': {
        target: 'http://localhost:3333',
        changeOrigin: true,
      },
    },
  },
});
