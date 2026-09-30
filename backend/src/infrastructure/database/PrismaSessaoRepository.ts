import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type {
  ColunaAcesso,
  FiltrosAcesso,
  ISessaoRepository,
  NovaSessao,
} from '@/application/sessao/ISessaoRepository';
import type { Paginado } from '@/application/auditoria/IAuditoriaRepository';
import { cortesDeSituacao, type SessaoAcesso } from '@/core/sessao/Sessao';

/**
 * A regra de situação, traduzida para SQL.
 *
 * É a única duplicação deste módulo, e existe por uma razão concreta: filtrar
 * em memória quebraria a paginação — a página 3 de "encerradas
 * inesperadamente" não sai de um recorte feito depois do `take`.
 *
 * O que **não** está duplicado é o que erra caro: a janela de 15 minutos e o
 * instante de corte vêm de `cortesDeSituacao`, no core. O que fica aqui é a
 * forma booleana, e `verificar:sessoes` confere que ela concorda com
 * `situacaoDaSessao` nos mesmos casos.
 */
function filtroDeSituacao(f: FiltrosAcesso): Prisma.SessaoAcessoWhereInput | undefined {
  if (!f.situacao) return undefined;
  const { agora, corteAtividade } = cortesDeSituacao();

  // Logout explícito vence tudo, inclusive um token ainda válido.
  if (f.situacao === 'ENCERRADA') return { logoutEm: { not: null } };

  if (f.situacao === 'ABERTA') {
    return {
      logoutEm: null,
      expiraEm: { gt: agora },
      ultimaAtividadeEm: { gte: corteAtividade },
    };
  }

  // Ninguém encerrou, e ou o token morreu, ou a pessoa parou de aparecer.
  return {
    logoutEm: null,
    OR: [{ expiraEm: { lte: agora } }, { ultimaAtividadeEm: { lt: corteAtividade } }],
  };
}

function montarWhere(f: FiltrosAcesso): Prisma.SessaoAcessoWhereInput {
  const where: Prisma.SessaoAcessoWhereInput = { usuarioId: f.usuarioId };

  if (f.de || f.ate) {
    where.logonEm = {
      gte: f.de ? new Date(`${f.de}T00:00:00.000Z`) : undefined,
      // Até o fim do dia informado, senão "até hoje" perderia hoje.
      lte: f.ate ? new Date(`${f.ate}T23:59:59.999Z`) : undefined,
    };
  }

  const situacao = filtroDeSituacao(f);
  // AND em vez de espalhar: o filtro de situação já usa `OR`, e misturá-lo com
  // o resto no mesmo nível faria o `OR` valer sobre a consulta inteira — o
  // recorte por usuário e por período seriam perdidos em silêncio.
  return situacao ? { AND: [where, situacao] } : where;
}

/** Colunas devolvidas. Sem `clienteId`: o recorte já vem da extension. */
const SELECAO = {
  id: true,
  usuarioId: true,
  usuarioNome: true,
  usuarioEmail: true,
  logonEm: true,
  logoutEm: true,
  ultimaAtividadeEm: true,
  expiraEm: true,
  lembrar: true,
  ip: true,
  navegador: true,
} as const;

export class PrismaSessaoRepository implements ISessaoRepository {
  /**
   * Abre a sessão do login.
   *
   * `clienteId` vai **explícito**, e não pelo carimbo automático da extension:
   * o login acontece antes de existir contexto de requisição, então
   * `contextoAtual()` é indefinido aqui. É a mesma razão pela qual `registrar()`
   * preenche o campo à mão na trilha de auditoria.
   */
  async abrir(d: NovaSessao): Promise<string> {
    const s = await prisma.sessaoAcesso.create({
      data: {
        clienteId: d.clienteId,
        usuarioId: d.usuarioId,
        usuarioNome: d.usuarioNome,
        usuarioEmail: d.usuarioEmail,
        expiraEm: d.expiraEm,
        lembrar: d.lembrar,
        ip: d.ip,
        navegador: d.navegador,
      },
      select: { id: true },
    });
    return s.id;
  }

  /**
   * Carimba o logout.
   *
   * `updateMany` com `logoutEm: null` no filtro, e não `update` por id, por
   * dois motivos que se somam: repetir o pedido não reescreve a hora (o duplo
   * clique em Sair, ou o botão mais o `sendBeacon`), e uma sessão que não
   * exista mais não vira exceção — não há o que avisar a quem está saindo.
   */
  async encerrar(sessaoId: string): Promise<void> {
    await prisma.sessaoAcesso.updateMany({
      where: { id: sessaoId, logoutEm: null },
      data: { logoutEm: new Date(), ultimaAtividadeEm: new Date() },
    });
  }

  /**
   * Carimba a atividade — **uma instrução, sem leitura antes**.
   *
   * A condição `ultimaAtividadeEm < limite` é o que transforma "uma escrita por
   * requisição" em "uma escrita por minuto por sessão". Ela vive no `where` de
   * propósito: ler para decidir gravar custaria duas idas ao banco onde uma
   * basta, e abriria corrida entre requisições simultâneas.
   */
  async registrarAtividade(sessaoId: string, limite: Date): Promise<void> {
    await prisma.sessaoAcesso.updateMany({
      where: { id: sessaoId, ultimaAtividadeEm: { lt: limite } },
      data: { ultimaAtividadeEm: new Date() },
    });
  }

  async listar({
    filtros,
    ordenarPor,
    descendente,
    page,
    pageSize,
  }: {
    filtros: FiltrosAcesso;
    ordenarPor: ColunaAcesso;
    descendente: boolean;
    page: number;
    pageSize: number;
  }): Promise<Paginado<SessaoAcesso>> {
    const where = montarWhere(filtros);
    const dir = descendente ? ('desc' as const) : ('asc' as const);
    /*
     * Desempate pelo logon, sempre.
     *
     * Ordenar só por `usuarioNome` deixaria a ordem das sessões de uma mesma
     * pessoa indefinida — e ordem indefinida com paginação é pior do que
     * parece: a mesma linha pode aparecer em duas páginas e outra em nenhuma.
     */
    const orderBy =
      ordenarPor === 'logonEm'
        ? [{ logonEm: dir }]
        : [{ [ordenarPor]: dir }, { logonEm: 'desc' as const }];
    const [data, total] = await Promise.all([
      prisma.sessaoAcesso.findMany({
        where,
        select: SELECAO,
        // O padrão é logon decrescente: é o que a tela pergunta primeiro ("quem
        // está no sistema agora?"), e o índice `[clienteId, logonEm]` o serve.
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.sessaoAcesso.count({ where }),
    ]);
    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  /**
   * Quem já acessou, do próprio histórico.
   *
   * `distinct` sobre o nome desnormalizado, e não um join com `Usuario`: quem
   * foi excluído do cadastro continua no histórico, e sumiria do filtro
   * justamente quando mais interessa procurá-lo.
   */
  async usuariosComAcesso(): Promise<{ id: string; nome: string }[]> {
    const linhas = await prisma.sessaoAcesso.findMany({
      distinct: ['usuarioId'],
      select: { usuarioId: true, usuarioNome: true },
      orderBy: { usuarioNome: 'asc' },
    });
    return linhas.map((l) => ({ id: l.usuarioId, nome: l.usuarioNome }));
  }
}
