/**
 * Confere as regras do Workflow (Fiscalização | Monitoramento). Sem banco.
 *
 * As regras daqui erram em silêncio, que é o pior tipo de erro num controle de
 * prazo: uma data de conclusão reescrita numa edição de texto, uma tarefa
 * duplicada a cada clique no sino, ou o vínculo com o alerta trocado — nada
 * disso quebra a tela, e todos fazem o acompanhamento mentir.
 *
 *   npm run verificar:workflow
 */
import { CriarTarefaUseCase } from '../src/application/tarefa/CriarTarefaUseCase';
import { AtualizarTarefaUseCase } from '../src/application/tarefa/AtualizarTarefaUseCase';
import { GerenciarTarefaUseCase } from '../src/application/tarefa/GerenciarTarefaUseCase';
import type { ITarefaRepository } from '../src/application/tarefa/ITarefaRepository';
import type { DadosTarefa, ListarTarefasParams, Paginado } from '../src/application/tarefa/dtos';
import { normalizarEValidarTarefa } from '../src/application/tarefa/validarTarefa';
import { situacaoPrazo, type ResumoTarefas, type Tarefa } from '../src/core/tarefa/Tarefa';
import { ALERTAS_SILENCIAVEIS } from '../src/core/tarefa/Tarefa';

const falhas: string[] = [];

function conferir(descricao: string, ok: boolean, detalhe = ''): void {
  console.log(`  ${ok ? 'ok  ' : 'FALHA'} ${descricao}${detalhe ? ` — ${detalhe}` : ''}`);
  if (!ok) falhas.push(descricao);
}

async function recusa(descricao: string, fn: () => unknown | Promise<unknown>): Promise<void> {
  try {
    await fn();
    conferir(descricao, false, 'aceitou o que deveria recusar');
  } catch {
    conferir(descricao, true);
  }
}

/** Repositório em memória — o suficiente para exercitar os casos de uso. */
class RepoFake implements ITarefaRepository {
  linhas = new Map<string, Tarefa>();
  private seq = 0;

  private montar(id: string, d: DadosTarefa): Tarefa {
    return {
      id,
      titulo: d.titulo,
      descricao: d.descricao,
      prioridade: d.prioridade,
      status: d.status,
      prazoLegal: d.prazoLegal.toISOString().slice(0, 10),
      ajusteId: d.ajusteId,
      compromissoId: d.compromissoId,
      ajusteCodigo: null,
      entidadeNome: null,
      responsavelId: d.responsavelId,
      responsavelNome: null,
      origemAlerta: d.origemAlerta,
      concluidaEm: d.concluidaEm,
      criadoPor: null,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    };
  }

  async buscarPorId(id: string) {
    return this.linhas.get(id) ?? null;
  }
  async buscarPorOrigemAlerta(origem: string) {
    return (
      [...this.linhas.values()].find((t) => t.origemAlerta === origem && t.status !== 'CANCELADA') ??
      null
    );
  }
  async criar(dados: DadosTarefa) {
    const id = `t${++this.seq}`;
    const t = this.montar(id, dados);
    this.linhas.set(id, t);
    return t;
  }
  async atualizar(id: string, dados: DadosTarefa) {
    const t = this.montar(id, dados);
    this.linhas.set(id, t);
    return t;
  }
  async excluir(id: string) {
    this.linhas.delete(id);
  }
  async listar(_p: ListarTarefasParams): Promise<Paginado<Tarefa>> {
    const data = [...this.linhas.values()];
    return { data, total: data.length, page: 1, pageSize: 15, totalPages: 1 };
  }
  async resumo(_hoje: string): Promise<ResumoTarefas> {
    return { abertas: 0, atrasadas: 0, venceEm7Dias: 0, concluidas: 0 };
  }
  async ajusteExiste(id: string) {
    return id === '11111111-1111-4111-8111-111111111111';
  }
  async usuarioExiste(id: string) {
    return id === '22222222-2222-4222-8222-222222222222';
  }
}

console.log('\nWorkflow — tarefas de acompanhamento\n');

// --- validação --------------------------------------------------------------
await recusa('título curto é recusado', () =>
  normalizarEValidarTarefa({ titulo: 'ab', prazoLegal: '2026-09-01' }),
);
await recusa('prazo ausente é recusado', () =>
  normalizarEValidarTarefa({ titulo: 'Renovar CND', prazoLegal: '' }),
);
await recusa('prioridade fora da lista é recusada', () =>
  normalizarEValidarTarefa({ titulo: 'Renovar CND', prazoLegal: '2026-09-01', prioridade: 'MAXIMA' }),
);
await recusa('id de ajuste que não é uuid é recusado', () =>
  normalizarEValidarTarefa({ titulo: 'Renovar CND', prazoLegal: '2026-09-01', ajusteId: 'abc' }),
);

{
  const d = normalizarEValidarTarefa({ titulo: 'Renovar CND', prazoLegal: '2026-09-01' });
  conferir('sem prioridade informada, assume MÉDIA', d.prioridade === 'MEDIA');
  conferir('sem status informado, nasce PENDENTE', d.status === 'PENDENTE');
  conferir('tarefa aberta não tem data de conclusão', d.concluidaEm === null);
}

// --- carimbo da conclusão ---------------------------------------------------
// É a data que prova, no sino, que a providência foi tomada. Reescrevê-la numa
// edição de texto apagaria o "quando" sem ninguém perceber.
{
  const concluida = normalizarEValidarTarefa(
    { titulo: 'Renovar CND', prazoLegal: '2026-09-01', status: 'CONCLUIDA' },
    { status: 'PENDENTE', concluidaEm: null },
  );
  conferir('concluir carimba a data', concluida.concluidaEm instanceof Date);

  const ontem = new Date('2026-08-01T12:00:00Z');
  const reeditada = normalizarEValidarTarefa(
    { titulo: 'Renovar CND (texto novo)', prazoLegal: '2026-09-01', status: 'CONCLUIDA' },
    { status: 'CONCLUIDA', concluidaEm: ontem },
  );
  conferir(
    'editar tarefa já concluída preserva a data original',
    reeditada.concluidaEm?.getTime() === ontem.getTime(),
    'senão a edição de um texto reescreveria o "quando"',
  );

  const reaberta = normalizarEValidarTarefa(
    { titulo: 'Renovar CND', prazoLegal: '2026-09-01', status: 'PENDENTE' },
    { status: 'CONCLUIDA', concluidaEm: ontem },
  );
  conferir('reabrir limpa a data de conclusão', reaberta.concluidaEm === null);
}

// --- idempotência da tarefa vinda do sino -----------------------------------
{
  const repo = new RepoFake();
  const criar = new CriarTarefaUseCase(repo);
  const a = await criar.execute({
    titulo: 'Cadastrar ajuste no Audesp',
    prazoLegal: '2026-09-01',
    origemAlerta: 'cadastro-ajuste:a1',
  });
  const b = await criar.execute({
    titulo: 'Cadastrar ajuste no Audesp',
    prazoLegal: '2026-09-01',
    origemAlerta: 'cadastro-ajuste:a1',
  });
  conferir('dois cliques no sino não criam duas tarefas', a.id === b.id && repo.linhas.size === 1);

  const avulsa1 = await criar.execute({ titulo: 'Conferir extrato', prazoLegal: '2026-09-01' });
  const avulsa2 = await criar.execute({ titulo: 'Conferir extrato', prazoLegal: '2026-09-01' });
  conferir(
    'tarefa avulsa repetida continua criando duas',
    avulsa1.id !== avulsa2.id,
    'só a que nasce de alerta é idempotente',
  );

  // Cancelada não bloqueia: quem cancelou descartou aquela providência.
  const gerenciar = new GerenciarTarefaUseCase(repo);
  await gerenciar.definirStatus(a.id, 'CANCELADA');
  const c = await criar.execute({
    titulo: 'Cadastrar ajuste no Audesp',
    prazoLegal: '2026-09-05',
    origemAlerta: 'cadastro-ajuste:a1',
  });
  conferir('depois de cancelar, o mesmo alerta gera tarefa nova', c.id !== a.id);
}

// --- vínculos ---------------------------------------------------------------
{
  const repo = new RepoFake();
  const criar = new CriarTarefaUseCase(repo);
  await recusa('ajuste inexistente é recusado', () =>
    criar.execute({
      titulo: 'Conferir plano',
      prazoLegal: '2026-09-01',
      ajusteId: '99999999-9999-4999-8999-999999999999',
    }),
  );
  await recusa('responsável inexistente é recusado', () =>
    criar.execute({
      titulo: 'Conferir plano',
      prazoLegal: '2026-09-01',
      responsavelId: '99999999-9999-4999-8999-999999999999',
    }),
  );
}

// --- origem imutável --------------------------------------------------------
// A chave é o que liga a tarefa de volta ao prazo. Se o payload pudesse
// trocá-la, uma edição desligaria a tarefa do alerta que ela existe para
// atender — e o sino voltaria a cobrar o que já está sendo feito.
{
  const repo = new RepoFake();
  const criada = await new CriarTarefaUseCase(repo).execute({
    titulo: 'Cadastrar aditivo',
    prazoLegal: '2026-09-01',
    origemAlerta: 'cadastro-aditivo:x1',
  });
  const editada = await new AtualizarTarefaUseCase(repo).execute(criada.id, {
    titulo: 'Cadastrar aditivo (revisado)',
    prazoLegal: '2026-09-10',
    origemAlerta: 'certidao:OUTRA',
  });
  conferir(
    'edição não troca o alerta de origem',
    editada.origemAlerta === 'cadastro-aditivo:x1',
    `ficou ${editada.origemAlerta}`,
  );
}

// --- mudança de status por um clique ---------------------------------------
{
  const repo = new RepoFake();
  const criada = await new CriarTarefaUseCase(repo).execute({
    titulo: 'Conferir certidões',
    prazoLegal: '2026-09-01',
  });
  const gerenciar = new GerenciarTarefaUseCase(repo);
  const concluida = await gerenciar.definirStatus(criada.id, 'CONCLUIDA');
  conferir('concluir pela grade carimba a data', !!concluida.concluidaEm);

  const reaberta = await gerenciar.definirStatus(criada.id, 'EM_ANDAMENTO');
  conferir('reabrir pela grade limpa a data', reaberta.concluidaEm === null);
  conferir('mudar status preserva o resto da tarefa', reaberta.titulo === 'Conferir certidões');

  await recusa('status inválido é recusado', () => gerenciar.definirStatus(criada.id, 'ARQUIVADA'));
}

// --- situação do prazo ------------------------------------------------------
{
  conferir('prazo vencido e aberta = ATRASADA', situacaoPrazo('PENDENTE', -1) === 'ATRASADA');
  conferir('vence hoje = HOJE', situacaoPrazo('EM_ANDAMENTO', 0) === 'HOJE');
  conferir('vence em 7 dias ainda é PRÓXIMA', situacaoPrazo('PENDENTE', 7) === 'PROXIMA');
  conferir('vence em 8 dias já é EM_DIA', situacaoPrazo('PENDENTE', 8) === 'EM_DIA');
  conferir(
    'concluída vencida não é atrasada',
    situacaoPrazo('CONCLUIDA', -30) === 'ENCERRADA',
    'o prazo parou de correr quando a providência foi tomada',
  );
  conferir('cancelada também é encerrada', situacaoPrazo('CANCELADA', -30) === 'ENCERRADA');
}

// --- o recorte do silêncio --------------------------------------------------
// Duplicado de propósito com `verificar:alertas`: lá se prova o comportamento,
// aqui se protege a lista em si. Acrescentar CERTIDAO a ela seria o erro mais
// caro deste módulo — o sino deixaria de avisar de uma certidão que continua
// vencida, porque alguém marcou uma tarefa como feita.
{
  conferir('cadastro de ajuste é silenciável', ALERTAS_SILENCIAVEIS.has('CADASTRO_AJUSTE'));
  conferir('cadastro de aditivo é silenciável', ALERTAS_SILENCIAVEIS.has('CADASTRO_ADITIVO'));
  conferir('declaração negativa é silenciável', ALERTAS_SILENCIAVEIS.has('DECLARACAO_NEGATIVA'));
  conferir('certidão NÃO é silenciável', !ALERTAS_SILENCIAVEIS.has('CERTIDAO'));
  conferir('prestação rejeitada NÃO é silenciável', !ALERTAS_SILENCIAVEIS.has('PRESTACAO_REJEITADA'));
  conferir('prestação do exercício NÃO é silenciável', !ALERTAS_SILENCIAVEIS.has('PRESTACAO_CONTAS'));
  conferir('a lista tem exatamente 3 tipos', ALERTAS_SILENCIAVEIS.size === 3);
}

// As regras da Agenda de Compromissos vivem em `verificar:agenda` — este
// script cobre as tarefas. Duplicá-las aqui só criaria dois lugares para
// atualizar quando a regra mudar.

console.log(falhas.length ? `\n${falhas.length} falha(s).\n` : '\nTudo ok.\n');
process.exit(falhas.length ? 1 : 0);
