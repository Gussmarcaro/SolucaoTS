/**
 * Confere que nenhuma rota ficou sem permissão declarada. Não precisa de banco.
 *
 * É a verificação mais importante do conjunto. As outras protegem contra dado
 * errado; esta protege contra acesso indevido — e a falha é silenciosa por
 * natureza: uma rota nova sem `exigirPermissao` funciona perfeitamente para
 * quem a criou, e para todo mundo mais também.
 *
 *   npm run verificar:permissoes
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RECURSOS, RECURSOS_POR_ID, RECURSO_INDISPENSAVEL } from '../src/core/permissao/Recurso';

const AQUI = dirname(fileURLToPath(import.meta.url));
const rotas = readFileSync(join(AQUI, '..', 'src', 'presentation', 'routes', 'index.ts'), 'utf8');

let falhas = 0;
const ok = (cond: boolean, msg: string, detalhe = '') => {
  console.log(`  ${cond ? 'ok  ' : 'FALHA'} ${msg}${detalhe ? ` — ${detalhe}` : ''}`);
  if (!cond) falhas++;
};

console.log('\nCobertura de permissões nas rotas\n');

/**
 * Rotas que podem ficar fora do gate, cada uma com o motivo.
 *
 * Exigir justificativa explícita é o ponto: sem esta lista, "sem permissão"
 * viraria o caminho de menor resistência para qualquer rota nova.
 */
const LIBERADAS: Record<string, string> = {
  '/health': 'sonda de disponibilidade, sem dado',
  '/auth': 'login — anterior à autenticação',
  '/dominios': 'catálogo oficial só de leitura, usado por todo formulário',
  '/busca': 'devolve só o que o usuário já veria nas telas',
  '/autoria/:entidade/:id': 'quem incluiu um registro; sem conteúdo do registro',
  '/alertas': 'prazos do próprio órgão, sem dado pessoal',
  '/assistente': 'responde a partir da documentação pública',
  '/assistente/status': 'diz apenas se o assistente existe',
  '/lgpd/acesso-dados': 'cada usuário grava o registro do próprio acesso',
  '/permissoes/eu/resumo': 'o usuário lendo as próprias permissões',
  '/suporte/orgaos': 'equipe do fornecedor — autorizada pela marca Usuario.suporte, não pela matriz',
  '/suporte/atender': 'equipe do fornecedor — troca o órgão do próprio token',
  '/suporte/provisionar': 'equipe do fornecedor — cria órgão novo, antes de existir matriz',
};

// Toda montagem de rota: routes.use('/x', ...) e routes.get/post/put/delete.
const montagens = [...rotas.matchAll(/routes\.(use|get|post|put|patch|delete)\(\s*'([^']+)'([^;]*)/g)];
ok(montagens.length > 10, 'arquivo de rotas foi lido', `${montagens.length} montagens`);

const desprotegidas: string[] = [];
for (const [, , caminho, resto] of montagens) {
  if (caminho in LIBERADAS) continue;
  if (/exigirPermissao\(|exigirGrupo\(/.test(resto)) continue;
  desprotegidas.push(caminho);
}

ok(
  desprotegidas.length === 0,
  'toda rota passa por exigirPermissao',
  desprotegidas.length
    ? `sem gate: ${desprotegidas.join(', ')} — aplique exigirPermissao ou justifique em LIBERADAS`
    : `${montagens.length - Object.keys(LIBERADAS).length} rotas protegidas`,
);

// Recurso citado nas rotas que não existe no catálogo derrubaria o servidor no
// boot (o middleware lança) — melhor descobrir aqui.
const citados = [...rotas.matchAll(/exigirPermissao\('([^']+)'/g)].map((m) => m[1]);
const inexistentes = citados.filter((id) => !RECURSOS_POR_ID.has(id));
ok(inexistentes.length === 0, 'recursos citados existem no catálogo', inexistentes.join(', '));

// Recurso sem nenhuma rota é permissão que a matriz oferece e não protege nada:
// o administrador configura, confia, e não há gate do outro lado.
const semRota = RECURSOS.map((r) => r.id).filter((id) => !citados.includes(id));
ok(
  semRota.length === 0,
  'todo recurso do catálogo protege alguma rota',
  semRota.length ? `sem rota: ${semRota.join(', ')}` : `${RECURSOS.length} recursos`,
);

ok(
  RECURSOS_POR_ID.has(RECURSO_INDISPENSAVEL),
  'o recurso indispensável existe',
  RECURSO_INDISPENSAVEL,
);

console.log(falhas ? `\n${falhas} falha(s).\n` : '\nTudo ok.\n');
process.exit(falhas ? 1 : 0);
