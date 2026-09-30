import type { SessaoAcesso, SituacaoSessao } from '@/core/sessao/Sessao';
import type { Paginado } from '@/application/auditoria/IAuditoriaRepository';

/** O que o login sabe sobre a sessão que está abrindo. */
export interface NovaSessao {
  clienteId: string;
  usuarioId: string;
  usuarioNome: string;
  usuarioEmail: string;
  /** Teto da sessão, lido do `exp` do token recém-assinado. */
  expiraEm: Date;
  lembrar: boolean;
  ip: string | null;
  navegador: string | null;
}

/**
 * Colunas por que a grade ordena.
 *
 * São as três **reais**. `Tempo` e `Situação` são derivadas na leitura e não
 * existem no SQL — ordenar por elas exigiria calcular a situação de todas as
 * linhas antes de paginar, o que é varrer a tabela inteira a cada página. Quem
 * responde à mesma pergunta é o **filtro** por situação, que recorta no banco.
 */
export type ColunaAcesso = 'logonEm' | 'logoutEm' | 'usuarioNome';

export interface FiltrosAcesso {
  usuarioId?: string;
  situacao?: SituacaoSessao;
  /** Início e fim do período, em 'YYYY-MM-DD', comparados com o **logon**. */
  de?: string;
  ate?: string;
}

/**
 * Port do histórico de acessos.
 *
 * Três escritas e duas leituras, e nenhuma alteração de conteúdo: a tabela é
 * append-only como a trilha de auditoria. Não há `excluir` nem `atualizar` de
 * propósito — um histórico que a tela pode editar não é histórico.
 */
export interface ISessaoRepository {
  /** Abre a sessão no login. Devolve o id, que vai no `jti` do token. */
  abrir(dados: NovaSessao): Promise<string>;

  /** Carimba o logout explícito. Idempotente: repetir não muda a hora. */
  encerrar(sessaoId: string): Promise<void>;

  /**
   * Atualiza `ultimaAtividadeEm`, **só** se a última já for anterior a
   * `limite`. A condição vai no `where` para que o custo seja uma instrução, e
   * não uma leitura seguida de escrita.
   */
  registrarAtividade(sessaoId: string, limite: Date): Promise<void>;

  listar(params: {
    filtros: FiltrosAcesso;
    ordenarPor: ColunaAcesso;
    descendente: boolean;
    page: number;
    pageSize: number;
  }): Promise<Paginado<SessaoAcesso>>;

  /** Quem já acessou, para alimentar o filtro da tela. */
  usuariosComAcesso(): Promise<{ id: string; nome: string }[]>;
}
