import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Contexto da requisição em curso.
 *
 * Existe para que a camada de dados saiba **quem** está operando sem que use
 * cases e repositórios precisem receber o usuário como parâmetro — o que
 * obrigaria a mudar dezenas de assinaturas e faria a regra de dependência
 * vazar. O middleware de autenticação abre o escopo; a extension de auditoria
 * e o preenchimento de `criadoPor` leem daqui.
 */
export interface ContextoRequisicao {
  usuarioId: string;
  usuarioNome: string;
  /** Método e caminho, guardados no registro de auditoria. */
  rota: string;
  /**
   * Órgão (tenant) do usuário — de onde sai o isolamento dos dados.
   *
   * `null` significa **sem filtro**, e continua legítimo nos caminhos sem
   * requisição: seeds, scripts e o startup da API, que precisam enxergar tudo.
   *
   * O que deixou de ser legítimo é **gravar** sem órgão: desde que
   * `clienteId` é obrigatório nas raízes, toda criação exige a resposta, e
   * quem a cobra é `tenantObrigatorio()`. Ler sem filtro é uma escolha de
   * quem roda um script; escrever sem dono era um registro órfão.
   */
  clienteId: string | null;
}

const armazenamento = new AsyncLocalStorage<ContextoRequisicao>();

/** Executa `fn` dentro do contexto informado. */
export function comContexto<T>(contexto: ContextoRequisicao, fn: () => T): T {
  return armazenamento.run(contexto, fn);
}

/**
 * Contexto atual, ou `undefined` fora de uma requisição — é o caso dos seeds,
 * dos scripts e do startup da API, que gravam sem usuário.
 */
export function contextoAtual(): ContextoRequisicao | undefined {
  return armazenamento.getStore();
}

/**
 * Órgão da requisição em curso, ou `null` quando não há filtro a aplicar.
 *
 * Existe como função própria para que a camada de dados leia o tenant sem
 * conhecer o resto do contexto — e para haver **um** lugar a mudar quando a
 * abertura transitória descrita acima for fechada.
 */
export function tenantAtual(): string | null {
  return armazenamento.getStore()?.clienteId ?? null;
}

/**
 * Órgão da requisição em curso, **exigindo** que haja um.
 *
 * É o que as criações usam. A diferença para `tenantAtual` é a pergunta que
 * cada uma responde: ler sem órgão é uma escolha legítima (um script que
 * precisa varrer tudo); gravar sem órgão é um registro que ninguém mais
 * enxerga — nem quem o criou, porque o filtro compara `clienteId = X` e nulo
 * nunca casa.
 *
 * Antes de `clienteId` ser obrigatório, esse registro nascia e sumia calado.
 * Agora o banco recusa, e este erro existe para a recusa vir com o nome do
 * que se tentou gravar, em vez de uma violação de NOT NULL crua.
 *
 * Um script que precise criar uma raiz abre o contexto antes
 * (`comContexto({ …, clienteId })`) — é o que `provisionar` já faz, passando o
 * órgão explicitamente porque cria o primeiro de todos.
 */
export function tenantObrigatorio(entidade: string): string {
  const cli = armazenamento.getStore()?.clienteId;
  if (!cli) {
    throw new Error(
      `Tentativa de criar ${entidade} sem órgão no contexto. ` +
        'Gravação fora de requisição precisa abrir `comContexto` com o clienteId.',
    );
  }
  return cli;
}
