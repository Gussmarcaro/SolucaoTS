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
   * `null` significa **sem filtro**, e hoje isso acontece em três situações
   * legítimas: token emitido antes desta versão, usuário ainda sem órgão
   * atribuído (o backfill é a fase 4) e os caminhos sem requisição — seeds,
   * scripts e o startup da API, que precisam enxergar tudo.
   *
   * É uma abertura transitória e conhecida: enquanto ela existe, o isolamento
   * vale para quem tem órgão e não vale para quem não tem. Ela fecha quando
   * `Usuario.clienteId` virar obrigatório, e `verificar:tenant` passa a cobrar
   * isso.
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
