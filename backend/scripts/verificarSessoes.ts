/**
 * Confere as regras do histórico de acessos. Sem banco.
 *
 * O que erra caro aqui é silencioso nos dois sentidos. Uma leitura frouxa
 * mostra como "aberta" a sessão de quem saiu há horas — e a tela passa a
 * afirmar que há gente no sistema que não está. Uma leitura errada do tempo de
 * permanência transforma "fechou a aba às 12h01" em "ficou 29 dias conectado",
 * e a coluna inteira vira ficção sem nada quebrar.
 *
 *   npm run verificar:sessoes
 */
import {
  JANELA_ABANDONO_MIN,
  SITUACAO_LABEL,
  cortesDeSituacao,
  fimDaSessao,
  formatarDuracao,
  situacaoDaSessao,
  tempoDePermanencia,
  type InstantesSessao,
} from '../src/core/sessao/Sessao';

const falhas: string[] = [];
const conferir = (descricao: string, ok: boolean, detalhe = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FALHA'} ${descricao}${detalhe ? ` — ${detalhe}` : ''}`);
  if (!ok) falhas.push(descricao);
};

const AGORA = new Date('2026-09-30T14:00:00.000Z');
const min = (n: number) => new Date(AGORA.getTime() + n * 60_000);

/** Sessão-base: entrou há 2h, ativa agora, token de 8h. */
const base = (p: Partial<InstantesSessao> = {}): InstantesSessao => ({
  logonEm: min(-120),
  logoutEm: null,
  ultimaAtividadeEm: min(0),
  expiraEm: min(360),
  ...p,
});

console.log('\nHistórico de acessos — situação e permanência\n');

// ---------------------------------------------------------------- situação
{
  conferir('sessão ativa agora é ABERTA', situacaoDaSessao(base(), AGORA) === 'ABERTA');

  conferir(
    'logout explícito é ENCERRADA',
    situacaoDaSessao(base({ logoutEm: min(-10) }), AGORA) === 'ENCERRADA',
  );

  conferir(
    'silêncio além da janela é ENCERRADA_INESPERADAMENTE',
    situacaoDaSessao(base({ ultimaAtividadeEm: min(-(JANELA_ABANDONO_MIN + 1)) }), AGORA) ===
      'ENCERRADA_INESPERADAMENTE',
    'fechar a aba, perder a conexão e desligar a máquina são indistinguíveis daqui',
  );

  conferir(
    'silêncio exatamente na janela ainda é ABERTA',
    situacaoDaSessao(base({ ultimaAtividadeEm: min(-JANELA_ABANDONO_MIN) }), AGORA) === 'ABERTA',
    'o limite é inclusivo; sem fixá-lo, mexer no sinal de > muda a tela sem nada quebrar',
  );

  conferir(
    'token expirado é ENCERRADA_INESPERADAMENTE mesmo com atividade recente',
    situacaoDaSessao(base({ expiraEm: min(-1) }), AGORA) === 'ENCERRADA_INESPERADAMENTE',
    'nenhuma requisição dela seria aceita a partir daí',
  );

  conferir(
    'logout vence o token expirado',
    situacaoDaSessao(base({ logoutEm: min(-400), expiraEm: min(-1) }), AGORA) === 'ENCERRADA',
    'quem saiu pela porta saiu pela porta, mesmo que o token tenha morrido depois',
  );

  conferir(
    'logout vence o silêncio',
    situacaoDaSessao(base({ logoutEm: min(-60), ultimaAtividadeEm: min(-60) }), AGORA) ===
      'ENCERRADA',
    'é o único sinal inequívoco que existe',
  );
}

// ------------------------------------------------------------- permanência
{
  conferir(
    'encerrada conta até o logout',
    tempoDePermanencia(base({ logoutEm: min(-30) }), AGORA) === 90,
    'entrou há 120min, saiu há 30min',
  );

  conferir('aberta conta até agora', tempoDePermanencia(base(), AGORA) === 120);

  /*
   * O erro que esta função existe para impedir. Sem ele a coluna diria que a
   * pessoa ficou 30 dias conectada porque o token era de 30 dias.
   */
  const abandonada = base({
    logonEm: min(-60 * 24 * 30),
    ultimaAtividadeEm: min(-60 * 24 * 30 + 41),
    expiraEm: min(60),
  });
  conferir(
    'abandonada conta até a última atividade, nunca até agora',
    tempoDePermanencia(abandonada, AGORA) === 41,
    'entrou há 30 dias e sumiu 41min depois; "agora" daria 43.200min',
  );

  conferir(
    'fimDaSessao concorda com a situação',
    fimDaSessao(base({ logoutEm: min(-30) }), AGORA).getTime() === min(-30).getTime() &&
      fimDaSessao(base(), AGORA).getTime() === AGORA.getTime() &&
      fimDaSessao(abandonada, AGORA).getTime() === abandonada.ultimaAtividadeEm.getTime(),
  );

  conferir(
    'permanência nunca é negativa',
    tempoDePermanencia(base({ logonEm: min(10), ultimaAtividadeEm: min(5), logoutEm: min(5) }), AGORA) === 0,
    'relógios divergem; "-5min" na tela é pior que zero',
  );
}

// ----------------------------------------------- o corte usado pelo filtro
{
  /*
   * O repositório recorta por situação **no SQL** — filtrar em memória
   * quebraria a paginação. Isso obriga a regra a existir dos dois lados, e é
   * aqui que se prova que os dois falam do mesmo instante: o corte que a
   * consulta usa tem de classificar exatamente como `situacaoDaSessao`.
   */
  const { agora, corteAtividade } = cortesDeSituacao(AGORA);
  conferir(
    'o corte da consulta é a janela de abandono',
    agora.getTime() === AGORA.getTime() &&
      AGORA.getTime() - corteAtividade.getTime() === JANELA_ABANDONO_MIN * 60_000,
  );

  // Para cada lado do corte, a condição SQL e a função pura têm de concordar.
  const casos: { nome: string; s: InstantesSessao }[] = [
    { nome: 'ativa', s: base() },
    { nome: 'no limite', s: base({ ultimaAtividadeEm: corteAtividade }) },
    { nome: 'um minuto além', s: base({ ultimaAtividadeEm: min(-(JANELA_ABANDONO_MIN + 1)) }) },
    { nome: 'token vencido', s: base({ expiraEm: min(-1) }) },
  ];
  for (const { nome, s } of casos) {
    // A tradução literal do `filtroDeSituacao` do repositório.
    const sqlAberta = !s.logoutEm && s.expiraEm > agora && s.ultimaAtividadeEm >= corteAtividade;
    conferir(
      `filtro "aberta" concorda com a regra (${nome})`,
      sqlAberta === (situacaoDaSessao(s, AGORA) === 'ABERTA'),
    );
  }
}

// ------------------------------------------------------------- apresentação
{
  conferir('95min viram "1h 35min"', formatarDuracao(95) === '1h 35min');
  conferir('120min viram "2h"', formatarDuracao(120) === '2h');
  conferir('40min viram "40min"', formatarDuracao(40) === '40min');
  conferir(
    'zero não vira "0min"',
    formatarDuracao(0) === 'menos de 1min',
    '"0min" parece defeito; "menos de 1min" é o que houve',
  );
  conferir(
    'toda situação tem rótulo',
    (['ABERTA', 'ENCERRADA', 'ENCERRADA_INESPERADAMENTE'] as const).every((s) => !!SITUACAO_LABEL[s]),
  );
}

console.log(
  falhas.length
    ? `\n${falhas.length} falha(s):\n${falhas.map((f) => `  - ${f}`).join('\n')}\n`
    : '\nTudo certo.\n',
);
process.exit(falhas.length ? 1 : 0);
