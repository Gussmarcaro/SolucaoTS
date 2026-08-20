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

// ---------------------------------------------------------------------------
// O outro lado: o menu do frontend.
//
// As checagens acima cuidam do servidor, que é quem de fato barra. Esta cuida
// de uma falha diferente e mais silenciosa: uma tela existir no menu e **não
// aparecer na matriz de permissões**. Ninguém percebe — o administrador
// configura tudo o que vê, conclui que cobriu o sistema, e aquela tela fica
// aberta a todos os grupos.
console.log('\nCobertura do menu\n');

const nav = readFileSync(
  join(AQUI, '..', '..', 'frontend', 'src', 'lib', 'navigation.ts'),
  'utf8',
);

/**
 * Itens de menu que podem ficar sem recurso, com o motivo.
 *
 * As telas de Execução são **placeholders sem backend**. Declarar recurso para
 * elas agora criaria o problema que a checagem acima reprova: permissão que a
 * matriz oferece e não protege nada. Os recursos entram junto com as rotas,
 * quando o módulo existir — e aí o gate do servidor passa a exigi-los.
 */
const MENU_SEM_RECURSO: Record<string, string> = {
  '/': 'Dashboard — todo usuário autenticado entra; cada painel dentro dela confere a própria permissão',
  '/execucao/financeiro/contas-bancarias': 'placeholder, sem backend',
  '/execucao/financeiro/receitas': 'placeholder, sem backend',
  '/execucao/financeiro/despesas': 'placeholder, sem backend',
  '/execucao/financeiro/pagamentos': 'placeholder, sem backend',
  '/execucao/financeiro/rateio': 'placeholder, sem backend',
  '/execucao/financeiro/conciliacao': 'placeholder, sem backend',
  '/execucao/tecnico': 'placeholder, sem backend',
};

const itensDoMenu = [...nav.matchAll(/{ label: '([^']+)',[^}]*?to: '([^']+)'([^}]*)}/g)].map(
  (m) => ({
    label: m[1],
    to: m[2],
    recurso: /recurso: '([A-Z_]+)'/.exec(m[3])?.[1] ?? null,
  }),
);

ok(itensDoMenu.length > 10, 'menu do frontend foi lido', `${itensDoMenu.length} itens com rota`);

const semRecursoNoMenu = itensDoMenu.filter((i) => !i.recurso && !(i.to in MENU_SEM_RECURSO));
ok(
  semRecursoNoMenu.length === 0,
  'toda tela do menu declara um recurso',
  semRecursoNoMenu.length
    ? `sem recurso: ${semRecursoNoMenu.map((i) => `${i.label} (${i.to})`).join(', ')} — declare o recurso ou justifique em MENU_SEM_RECURSO`
    : `${itensDoMenu.length - Object.keys(MENU_SEM_RECURSO).length} telas cobertas`,
);

// Recurso citado no menu que não existe no catálogo esconderia o item para
// todo mundo: `filtrarPorPermissao` não acharia a concessão e removeria a tela.
const citadosNoMenu = itensDoMenu.map((i) => i.recurso).filter(Boolean) as string[];
const fantasmas = citadosNoMenu.filter((id) => !RECURSOS_POR_ID.has(id));
ok(fantasmas.length === 0, 'recursos citados no menu existem no catálogo', fantasmas.join(', '));

// Recurso do catálogo que não aparece no menu: o administrador configura uma
// permissão para uma tela que ninguém alcança pelo menu. Nem sempre é erro —
// Empresas está suspenso de propósito —, então aqui é aviso, não falha.
const foraDoMenu = RECURSOS.map((r) => r.id).filter((id) => !citadosNoMenu.includes(id));
if (foraDoMenu.length)
  console.log(`  --   ${foraDoMenu.length} recurso(s) fora do menu: ${foraDoMenu.join(', ')}`);

console.log(falhas ? `\n${falhas} falha(s).\n` : '\nTudo ok.\n');
process.exit(falhas ? 1 : 0);
