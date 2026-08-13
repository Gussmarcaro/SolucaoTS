/**
 * Confere a base de conhecimento do assistente. Não chama a API nem o banco.
 *
 * O que se está protegendo aqui é a falha silenciosa mais provável desta
 * feature: alguém muda o menu do sistema, ninguém roda `assistente:base`, e o
 * assistente passa a ensinar um caminho de tela que não existe mais — com toda
 * a confiança de quem está citando a documentação.
 *
 *   npm run verificar:assistente
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { corpus, TITULOS } from '../src/infrastructure/assistente/baseConhecimento';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const falhas: string[] = [];

function conferir(descricao: string, ok: boolean, detalhe = ''): void {
  console.log(`  ${ok ? 'ok  ' : 'FALHA'} ${descricao}${detalhe ? ` — ${detalhe}` : ''}`);
  if (!ok) falhas.push(descricao);
}

console.log('\nBase de conhecimento do assistente\n');

// 1. O corpus monta e todos os documentos entraram nomeados.
let texto = '';
try {
  texto = corpus();
} catch (e) {
  conferir('corpus carrega', false, (e as Error).message);
}

if (texto) {
  conferir('corpus carrega', true, `${(texto.length / 1024).toFixed(0)} KB`);
  for (const titulo of TITULOS)
    conferir(`documento presente: ${titulo.slice(0, 46)}`, texto.includes(`titulo="${titulo}"`));

  // Um PDF que extraiu vazio passaria despercebido e viraria "não encontrei
  // na documentação" para tudo o que estivesse nele.
  const vazios = texto
    .split('<documento ')
    .slice(1)
    .filter((d) => d.split('\n').slice(1).join('\n').trim().length < 2000);
  conferir('nenhum documento veio quase vazio', vazios.length === 0, `${vazios.length} suspeito(s)`);
}

// 2. O mapa de navegação está em dia com o menu real.
const menu = readFileSync(join(RAIZ, 'frontend', 'src', 'lib', 'navigation.ts'), 'utf8');
const rotasDoMenu = [...menu.matchAll(/to:\s*'([^']+)'/g)].map((m) => m[1]);
const mapa = readFileSync(
  join(RAIZ, 'backend', 'src', 'infrastructure', 'assistente', 'base', 'sistema-navegacao.md'),
  'utf8',
);

const ausentes = rotasDoMenu.filter((r) => !mapa.includes(`\`${r}\``));
conferir(
  'mapa de navegação cobre todas as rotas do menu',
  ausentes.length === 0,
  ausentes.length ? `faltam: ${ausentes.join(', ')} — rode npm run assistente:base` : `${rotasDoMenu.length} rotas`,
);

// A recíproca: rota no mapa que sumiu do menu manda o usuário a lugar nenhum.
// Só as linhas do menu (`— rota \`…\``) contam: a seção de observações cita
// rotas de propósito para dizer que **não** estão no menu, como /empresas.
const rotasDoMapa = [...mapa.matchAll(/— rota `([^`]+)`/g)].map((m) => m[1]);
const sobrando = rotasDoMapa.filter((r) => !rotasDoMenu.includes(r));
conferir(
  'mapa não cita rota que saiu do menu',
  sobrando.length === 0,
  sobrando.length ? `sobrando: ${sobrando.join(', ')} — rode npm run assistente:base` : '',
);

// 3. As instruções seguem exigindo a ancoragem na documentação. Se alguém
//    afrouxar isso sem perceber, o assistente vira um chat genérico.
const instrucoes = readFileSync(
  join(RAIZ, 'backend', 'src', 'application', 'assistente', 'instrucoes.ts'),
  'utf8',
);
for (const marca of [
  'Não encontrei essa informação na documentação disponível',
  'não pode confirmar que ela existe',
  'em vez de deduzir um caminho',
])
  conferir(`instrução preservada: "${marca.slice(0, 40)}…"`, instrucoes.includes(marca));

console.log(falhas.length ? `\n${falhas.length} falha(s).\n` : '\nTudo ok.\n');
process.exit(falhas.length ? 1 : 0);
