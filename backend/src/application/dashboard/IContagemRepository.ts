/**
 * Contagem dos cadastros para o rodapé do Dashboard.
 *
 * Existe por um motivo medido, não estético: a tela disparava **doze**
 * requisições só para desenhar seis números — duas por cadastro, uma do total e
 * outra só dos ativos, cada uma uma listagem paginada em `pageSize: 1` da qual
 * se aproveitava apenas o campo `total`. Era mais da metade das ~22 requisições
 * do carregamento, gasta no bloco que o próprio CLAUDE.md chama duas vezes de
 * "a informação menos acionável da tela".
 *
 * Aqui vira **uma** requisição, e as contagens correm em paralelo numa conexão
 * só — `count` no banco é barato; o que custava era a ida e volta HTTP.
 */

/** Cadastro contado, na ordem em que a faixa o exibe. */
export type ChaveCadastro =
  | 'entidades'
  | 'fornecedores'
  | 'colaboradores'
  | 'contratos'
  | 'bens'
  | 'servidores';

export interface Contagem {
  chave: ChaveCadastro;
  total: number;
  /**
   * Quantos estão ativos. **Nulo quando o cadastro não tem a coluna `ativo`** —
   * é o caso de `BemCedidoCadastro`. Devolver o total no lugar faria a tela
   * afirmar "todos ativos" sobre um cadastro que não conhece a distinção.
   */
  ativos: number | null;
}

/** O recurso da matriz que governa cada cadastro. */
export const RECURSO_DO_CADASTRO: Record<ChaveCadastro, string> = {
  entidades: 'CADASTRO_ENTIDADES',
  fornecedores: 'CADASTRO_FORNECEDORES',
  colaboradores: 'CADASTRO_COLABORADORES',
  contratos: 'CADASTRO_CONTRATOS',
  bens: 'CADASTRO_BENS_CEDIDOS',
  servidores: 'CADASTRO_SERVIDORES_CEDIDOS',
};

export interface IContagemRepository {
  /** Conta apenas os cadastros pedidos — o recorte por órgão vem da extension. */
  contar(cadastros: ChaveCadastro[]): Promise<Contagem[]>;
}

/**
 * Leitura das permissões de um grupo, como **port**.
 *
 * O caso de uso precisa saber o que o grupo pode ler, e quem sabe isso é o
 * cache em `infrastructure`. Importá-lo daqui inverteria a regra de dependência
 * do projeto — `application` não conhece `infrastructure`. A porta custa cinco
 * linhas e mantém a regra intacta.
 */
export interface IPermissoesLeitor {
  /**
   * Os recursos que o grupo pode **ler**.
   *
   * `null` significa "grupo nunca configurado", que no RBAC deste sistema
   * libera tudo — e é por isso que não se devolve uma lista vazia no lugar:
   * vazio e "sem restrição" são respostas opostas.
   */
  recursosLegiveis(grupoNome: string | null): Promise<Set<string> | null>;
}
