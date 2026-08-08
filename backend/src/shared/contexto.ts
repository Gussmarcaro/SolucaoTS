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
