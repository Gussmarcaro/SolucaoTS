import jwt, { type SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-troque-em-producao';
const JWT_EXPIRES = process.env.JWT_EXPIRES ?? '8h';
const JWT_EXPIRES_REMEMBER = process.env.JWT_EXPIRES_REMEMBER ?? '30d';

export interface TokenPayload {
  sub: string; // id do usuário
  nome: string;
  email: string;
  /**
   * Nome do grupo de acesso. Vai no token para o front decidir o que exibir
   * sem uma ida extra ao servidor — mas quem barra o acesso é o middleware
   * `exigirGrupo`, não a interface.
   *
   * Ausente em tokens emitidos antes desta versão: quem estiver logado precisa
   * entrar de novo para o grupo passar a valer.
   */
  grupo?: string | null;
  /**
   * Órgão (tenant) a que o usuário pertence — a origem do isolamento de dados.
   *
   * Vem do token, e não de uma consulta por requisição, porque é lido em toda
   * consulta ao banco: buscar o órgão a cada chamada dobraria o número de idas
   * ao banco só para descobrir algo que não muda dentro da sessão.
   *
   * Vai como `cli` e não como `clienteId` por ser curto e aparecer em todo
   * token; e é **opcional** por duas razões que se somam: tokens emitidos antes
   * desta versão não o têm, e `Usuario.clienteId` ainda é nulo até o backfill.
   * Enquanto for nulo, o usuário não é filtrado — ver `contextoAtual`.
   */
  cli?: string | null;
  /**
   * Equipe do fornecedor. Autoriza duas coisas que ninguém mais pode: criar um
   * órgão novo com o primeiro administrador dele, e trocar o `cli` do próprio
   * token para atender um cliente.
   *
   * Note que **não** é um passe-livre: o suporte continua operando dentro de um
   * órgão de cada vez, e o token diz qual. A diferença é poder escolher.
   */
  sup?: boolean;
  /**
   * Identificador da **sessão** aberta neste login (`SessaoAcesso.id`).
   *
   * É o que liga uma requisição qualquer de volta ao registro de acesso — sem
   * ele o token é anônimo quanto à sessão, e nem o logout saberia qual linha
   * fechar. Usa o nome padrão do JWT (`jti`) por ser exatamente isso.
   *
   * **Opcional**, e não por preguiça: tokens emitidos antes desta versão não o
   * têm. Sessão sem `jti` simplesmente não é carimbada — quem já estava
   * logado passa a ser registrado quando sair e entrar de novo, como aconteceu
   * com o grupo.
   */
  jti?: string;
}

/** Assina um JWT. Com "lembrar de mim", usa expiração estendida. */
export function assinarToken(payload: TokenPayload, lembrar = false): string {
  const options: SignOptions = {
    expiresIn: (lembrar ? JWT_EXPIRES_REMEMBER : JWT_EXPIRES) as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, JWT_SECRET, options);
}

/**
 * Instante em que o token expira, lido do próprio `exp` que o `jsonwebtoken`
 * acabou de escrever.
 *
 * Existe para o registro de acesso guardar o teto da sessão sem reinterpretar
 * `JWT_EXPIRES` / `JWT_EXPIRES_REMEMBER` por conta própria: duas leituras da
 * mesma duração divergiriam no dia em que alguém mudasse uma das variáveis.
 */
export function expiracaoDoToken(token: string): Date {
  const exp = (jwt.decode(token) as { exp?: number } | null)?.exp;
  return exp ? new Date(exp * 1000) : new Date();
}

/** Verifica e decodifica um JWT. Lança se inválido/expirado. */
export function verificarToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}
