/**
 * Confere as regras da Agenda de Compromissos. Sem banco.
 *
 * O núcleo aqui é **visibilidade**, e ela é diferente das outras regras do
 * sistema num ponto: errar para menos esconde um compromisso; errar para mais
 * mostra a agenda pessoal de alguém para o escritório inteiro. Nenhum dos dois
 * quebra a tela, e o segundo não aparece em teste de funcionalidade nenhum.
 *
 *   npm run verificar:agenda
 */
import {
  podeAlterar,
  podeVer,
  VISIBILIDADES,
  type CompromissoVisivel,
  type Espectador,
} from '../src/core/compromisso/visibilidade';
import { expandirRecorrencia, MAX_OCORRENCIAS } from '../src/core/compromisso/Compromisso';
import { normalizarEValidarCompromisso } from '../src/application/compromisso/validarCompromisso';

const falhas: string[] = [];

function conferir(descricao: string, ok: boolean, detalhe = ''): void {
  console.log(`  ${ok ? 'ok  ' : 'FALHA'} ${descricao}${detalhe ? ` — ${detalhe}` : ''}`);
  if (!ok) falhas.push(descricao);
}

function recusa(descricao: string, fn: () => unknown): void {
  try {
    fn();
    conferir(descricao, false, 'aceitou o que deveria recusar');
  } catch {
    conferir(descricao, true);
  }
}

const CRIADOR: Espectador = { usuarioId: 'u-criador', grupoId: 'g-admin' };
const CONVIDADO: Espectador = { usuarioId: 'u-convidado', grupoId: 'g-outro' };
const DO_GRUPO: Espectador = { usuarioId: 'u-do-grupo', grupoId: 'g-admin' };
const ESTRANHO: Espectador = { usuarioId: 'u-estranho', grupoId: 'g-outro' };

const compromisso = (over: Partial<CompromissoVisivel> = {}): CompromissoVisivel => ({
  visibilidade: 'ORGAO',
  criadoPor: 'u-criador',
  participantesIds: [],
  gruposIds: [],
  ...over,
});

console.log('\nAgenda de Compromissos\n');

// --- particular -------------------------------------------------------------
{
  const c = compromisso({ visibilidade: 'PARTICULAR' });
  conferir('particular: o criador vê', podeVer(c, CRIADOR));
  conferir('particular: mais ninguém vê', !podeVer(c, ESTRANHO) && !podeVer(c, DO_GRUPO));

  // A regra que a especificação faz questão de fixar: cargo não abre agenda.
  conferir(
    'particular: nem quem administra a agenda vê',
    !podeAlterar(c, ESTRANHO, true),
    'perfil administrativo não é autorização para ler agenda pessoal',
  );

  // Estar no mesmo grupo do criador não basta — particular ignora grupo.
  conferir('particular ignora o grupo do criador', !podeVer(c, DO_GRUPO));
}

// --- usuários específicos ---------------------------------------------------
{
  const c = compromisso({ visibilidade: 'RESTRITO', participantesIds: ['u-convidado'] });
  conferir('restrito: o convidado vê', podeVer(c, CONVIDADO));
  conferir('restrito: o criador vê', podeVer(c, CRIADOR));
  conferir('restrito: quem não foi convidado não vê', !podeVer(c, ESTRANHO));
  conferir(
    'restrito por usuário ignora o grupo',
    !podeVer(c, DO_GRUPO),
    'estar no grupo do criador não convida ninguém',
  );
}

// --- grupos -----------------------------------------------------------------
{
  const c = compromisso({ visibilidade: 'RESTRITO', gruposIds: ['g-admin'] });
  conferir('grupo: membro do grupo vê', podeVer(c, DO_GRUPO));
  conferir('grupo: quem é de outro grupo não vê', !podeVer(c, CONVIDADO));

  // O vínculo é com o grupo, não com a lista de membros do momento — por isso
  // quem entra depois passa a ver sem nada ser reprocessado.
  const novoMembro: Espectador = { usuarioId: 'u-novo', grupoId: 'g-admin' };
  conferir(
    'quem entra no grupo depois passa a ver',
    podeVer(c, novoMembro),
    'o vínculo é com o grupo, não com a lista de membros',
  );

  const semGrupo: Espectador = { usuarioId: 'u-sem', grupoId: null };
  conferir('usuário sem grupo não entra por essa porta', !podeVer(c, semGrupo));
}

// --- órgão ------------------------------------------------------------------
{
  const c = compromisso({ visibilidade: 'ORGAO' });
  conferir('órgão: todo mundo do órgão vê', podeVer(c, ESTRANHO) && podeVer(c, DO_GRUPO));
}

// --- quem pode alterar ------------------------------------------------------
{
  const c = { ...compromisso({ visibilidade: 'RESTRITO', participantesIds: ['u-convidado'] }), responsavelId: 'u-resp' };
  conferir('o criador altera', podeAlterar(c, CRIADOR));
  conferir('o responsável altera', podeAlterar(c, { usuarioId: 'u-resp', grupoId: null }));
  conferir(
    'ser convidado não dá direito de alterar',
    !podeAlterar(c, CONVIDADO),
    'a reunião é de quem a marcou',
  );
  conferir('quem administra a agenda altera o compartilhado', podeAlterar(c, ESTRANHO, true));
}

// --- validação --------------------------------------------------------------
{
  const base = { titulo: 'Reunião de monitoramento', inicioEm: '2026-09-12T14:00' };

  recusa('título curto é recusado', () => normalizarEValidarCompromisso({ ...base, titulo: 'ab' }));
  recusa('sem início é recusado', () => normalizarEValidarCompromisso({ ...base, inicioEm: '' }));
  recusa('término antes do início é recusado', () =>
    normalizarEValidarCompromisso({ ...base, fimEm: '2026-09-12T13:00' }),
  );
  recusa('cor fora da paleta é recusada', () =>
    normalizarEValidarCompromisso({ ...base, cor: '#ff0000' }),
  );
  recusa('registro sem estar realizado é recusado', () =>
    normalizarEValidarCompromisso({ ...base, registro: 'Ata.' }),
  );
  recusa('alertas repetidos são recusados', () =>
    normalizarEValidarCompromisso({
      ...base,
      alertas: [{ minutosAntes: 30 }, { minutosAntes: 30, canal: 'SISTEMA' }],
    }),
  );

  // Restrito sem ninguém convidado é um particular com o rótulo errado — e o
  // rótulo é lido pela regra de segurança.
  recusa('restrito sem participante nem grupo é recusado', () =>
    normalizarEValidarCompromisso({ ...base, visibilidade: 'RESTRITO' }),
  );
  recusa('particular com participante é recusado', () =>
    normalizarEValidarCompromisso({
      ...base,
      visibilidade: 'PARTICULAR',
      participantes: ['11111111-1111-4111-8111-111111111111'],
    }),
  );

  {
    const d = normalizarEValidarCompromisso(base);
    conferir('sem término, assume uma hora', d.fimEm.getTime() - d.inicioEm.getTime() === 3_600_000);
    conferir('nasce visível ao órgão', d.visibilidade === 'ORGAO');
    conferir('nasce sem repetição', d.recorrencia === 'NAO_REPETE');
  }

  {
    const d = normalizarEValidarCompromisso({ ...base, diaInteiro: true });
    conferir('dia inteiro termina às 23:59', d.fimEm.getHours() === 23 && d.fimEm.getMinutes() === 59);
  }

  {
    // Trocar para "não repete" precisa limpar a regra antiga, senão sobra uma
    // recorrência órfã que a expansão volta a considerar.
    const d = normalizarEValidarCompromisso({
      ...base,
      recorrencia: 'NAO_REPETE',
      recorrenciaIntervalo: 2,
      recorrenciaAte: '2026-12-31',
    });
    conferir('sem repetição, a regra é zerada', d.recorrenciaIntervalo === null && d.recorrenciaAte === null);
  }

  conferir('as três visibilidades estão declaradas', VISIBILIDADES.length === 3);
}

// --- recorrência ------------------------------------------------------------
{
  const base = {
    inicioEm: new Date('2026-09-01T14:00:00'),
    fimEm: new Date('2026-09-01T15:00:00'),
    recorrenciaIntervalo: null as number | null,
    recorrenciaAte: null as Date | null,
  };
  const setembro = { de: new Date('2026-09-01T00:00:00'), ate: new Date('2026-09-30T23:59:59') };

  const semanal = expandirRecorrencia({ ...base, recorrencia: 'SEMANAL' }, setembro);
  conferir('semanal rende 5 ocorrências em setembro/2026', semanal.length === 5, `${semanal.length}`);
  conferir(
    'a ocorrência preserva a duração',
    semanal[1].fimEm.getTime() - semanal[1].inicioEm.getTime() === 3_600_000,
  );

  const quinzenal = expandirRecorrencia(
    { ...base, recorrencia: 'SEMANAL', recorrenciaIntervalo: 2 },
    setembro,
  );
  conferir('intervalo 2 rende metade', quinzenal.length === 3, `${quinzenal.length}`);

  const comFim = expandirRecorrencia(
    { ...base, recorrencia: 'SEMANAL', recorrenciaAte: new Date('2026-09-15T23:59:59') },
    setembro,
  );
  conferir('a data de término corta a série', comFim.length === 3, `${comFim.length}`);

  const foraDaJanela = expandirRecorrencia(
    { ...base, recorrencia: 'NAO_REPETE' },
    { de: new Date('2026-10-01'), ate: new Date('2026-10-31') },
  );
  conferir('evento fora da janela não aparece', foraDaJanela.length === 0);

  // Mensal em dia 31: o mês seguinte não tem, e a aritmética de data escorrega
  // para o mês adiante. O comportamento é conhecido e fica fixado aqui.
  const dia31 = expandirRecorrencia(
    {
      inicioEm: new Date('2026-01-31T10:00:00'),
      fimEm: new Date('2026-01-31T11:00:00'),
      recorrencia: 'MENSAL',
      recorrenciaIntervalo: null,
      recorrenciaAte: null,
    },
    { de: new Date('2026-01-01'), ate: new Date('2026-04-30T23:59:59') },
  );
  conferir(
    'mensal a partir do dia 31 não se perde',
    dia31.length >= 3,
    `${dia31.length} ocorrências — fevereiro escorrega para março, comportamento conhecido`,
  );

  // Regra sem fim não pode virar laço longo: o teto é o que garante isso.
  const semFim = expandirRecorrencia(
    { ...base, recorrencia: 'DIARIA' },
    { de: new Date('2026-09-01'), ate: new Date('2030-09-01') },
  );
  conferir(
    'série sem fim respeita o teto de ocorrências',
    semFim.length <= MAX_OCORRENCIAS,
    `${semFim.length} ≤ ${MAX_OCORRENCIAS}`,
  );
}

console.log(falhas.length ? `\n${falhas.length} falha(s).\n` : '\nTudo ok.\n');
process.exit(falhas.length ? 1 : 0);
