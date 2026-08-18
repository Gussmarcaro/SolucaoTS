/**
 * Log estruturado — uma linha JSON por evento, no stdout.
 *
 * JSON e não texto livre porque a pergunta que o log precisa responder é
 * sempre um filtro: "o que falhou **para a Prefeitura X** ontem à tarde". Com
 * linha solta isso vira leitura; com campo, vira busca.
 *
 * Vai para o stdout, e não para arquivo ou serviço, porque toda hospedagem já
 * captura o stdout — não há nada a instalar, rodar ou manter no ar. Quando um
 * agregador entrar (Sentry e afins), ele lê daqui.
 *
 * **Não é a trilha de auditoria.** A auditoria responde "quem alterou este
 * fornecedor" para o órgão e para o Tribunal, e guarda para sempre. Isto
 * responde "por que a requisição das 14h32 falhou" para quem opera o sistema, e
 * pode ser descartado em semanas. Em particular, a auditoria **não** registra
 * requisição que falhou — se a gravação estourou, não há alteração a registrar,
 * e é justamente esse o caso que se precisa investigar.
 */

export type NivelLog = 'info' | 'aviso' | 'erro';

/**
 * Campos que nunca entram no log.
 *
 * Log é lugar clássico de vazamento: um payload inteiro registrado carrega CPF,
 * e-mail e às vezes senha. A regra é a mesma da auditoria — identificadores e
 * rota, nunca conteúdo.
 */
const CAMPOS_SENSIVEIS = new Set([
  'senha',
  'senhaHash',
  'confirmarSenha',
  'token',
  'resetTokenHash',
  'authorization',
  'documento',
  'cpf',
  'cnpj',
]);

/** Substitui valores sensíveis por `[oculto]`, recursivamente. */
export function ocultarSensiveis(valor: unknown, profundidade = 0): unknown {
  if (profundidade > 4 || valor === null || typeof valor !== 'object') return valor;
  if (Array.isArray(valor)) return valor.map((v) => ocultarSensiveis(v, profundidade + 1));

  const saida: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
    saida[k] = CAMPOS_SENSIVEIS.has(k) ? '[oculto]' : ocultarSensiveis(v, profundidade + 1);
  }
  return saida;
}

/**
 * Identificadores opacos em caminho de URL viram `:id`.
 *
 * Sem isto cada requisição gera uma "rota" diferente e não há como agrupar —
 * `/api/prestacoes/<uuid>/json` apareceria mil vezes como mil rotas distintas.
 * O registro específico continua identificado pelo usuário e pelo órgão.
 */
export function normalizarRota(caminho: string): string {
  return caminho
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/\d{3,}/g, '/:n');
}

export interface DadosLog {
  [campo: string]: unknown;
}

/** Emite uma linha. `erro` e `aviso` vão para o stderr, como se espera. */
export function registrar(nivel: NivelLog, evento: string, dados: DadosLog = {}): void {
  const linha = JSON.stringify({
    t: new Date().toISOString(),
    nivel,
    evento,
    ...(ocultarSensiveis(dados) as DadosLog),
  });
  if (nivel === 'erro' || nivel === 'aviso') console.error(linha);
  else console.log(linha);
}
