import * as Sentry from '@sentry/node';
import type { ErrorEvent, EventHint } from '@sentry/node';
import { AppError } from './errors';
import { normalizarRota, ocultarSensiveis, registrar } from './log';

/**
 * Agregação e alerta de erros (nível 2 da observabilidade).
 *
 * O log estruturado responde "o que aconteceu com esta requisição". Isto
 * responde duas outras: **"este erro é novo ou já acontece há semanas?"** e
 * **"quantos órgãos ele está atingindo?"** — e avisa antes do telefonema.
 *
 * ## Por que um serviço externo, e não uma tabela no nosso banco
 *
 * Guardar erro no próprio Postgres pareceria mais seguro e seria mais barato.
 * Mas o erro que mais importa investigar é justamente o que acontece **quando o
 * banco está com problema** — e aí a tabela não registra nada. Um coletor
 * externo é o único que continua funcionando quando o que falhou é a base.
 *
 * ## O que sai daqui, e o que não sai
 *
 * O sistema guarda dados pessoais de dirigentes, empregados e beneficiários de
 * OSC. Nada disso pode ir parar num serviço de terceiros por descuido de
 * configuração — e os padrões do SDK são permissivos: ele mandaria cookies,
 * cabeçalhos (inclusive o `Authorization`), corpo das requisições e a query
 * string. Tudo isso está **desligado** abaixo, explicitamente.
 *
 * Vai só o que responde as perguntas acima: tipo do erro, stack, rota
 * normalizada, id da requisição e **o órgão** — que é como se descobre se o
 * problema é de um cliente ou de todos.
 *
 * ## Ligado só quando configurado
 *
 * Sem `SENTRY_DSN` nada é iniciado e nada é enviado, como o assistente sem
 * `ANTHROPIC_API_KEY`. Desenvolvimento e a máquina de quem clona o repositório
 * não falam com serviço nenhum.
 */

export const monitoramentoAtivo = (): boolean => !!process.env.SENTRY_DSN;

/**
 * Erro previsto não é incidente.
 *
 * Senha errada, dado inválido, sem permissão — `AppError` é o sistema
 * funcionando. Se isso chegasse ao agregador, o painel encheria de "erros" que
 * são uso normal e o alerta viraria ruído que ninguém lê.
 */
export function ehIncidente(erro: unknown): boolean {
  return !(erro instanceof AppError);
}

/**
 * Última peneira antes do envio.
 *
 * Existe mesmo com as categorias desligadas, como cinto e suspensório: uma
 * atualização do SDK que mude um padrão não pode virar vazamento silencioso.
 */
export function limparEvento(evento: ErrorEvent): ErrorEvent | null {
  if (evento.request) {
    // Fica só o caminho, sem query string — é lá que o usuário digita nome e
    // CPF na busca.
    const url = evento.request.url?.split('?')[0];
    evento.request = {
      method: evento.request.method,
      url: url ? normalizarRota(url) : undefined,
    };
  }

  delete evento.user;
  delete evento.breadcrumbs;
  if (evento.extra) evento.extra = ocultarSensiveis(evento.extra) as Record<string, unknown>;

  return evento;
}

/** Inicia o monitoramento. Chamar **antes** de montar a aplicação. */
export function iniciarMonitoramento(): void {
  if (!monitoramentoAtivo()) return;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    // Versão publicada, para o painel agrupar erro por release. `RENDER_GIT_COMMIT`
    // era preenchida pela hospedagem antiga; num servidor próprio ela vem do
    // deploy, e o nome genérico evita amarrar o código a um fornecedor.
    release: process.env.APP_RELEASE ?? process.env.RENDER_GIT_COMMIT ?? undefined,

    // Amostragem de desempenho desligada: o que se quer aqui é erro, e traço de
    // transação carregaria consulta e parâmetro para fora sem necessidade.
    tracesSampleRate: 0,

    /*
     * Todas as categorias que carregam dado pessoal, desligadas — os padrões do
     * SDK ligam quase tudo. Cada linha aqui é uma decisão, não uma cópia:
     */
    dataCollection: {
      userInfo: false, // nome, e-mail e IP de quem estava operando
      cookies: false, // sessão de quem estava operando
      httpHeaders: { request: false, response: false }, // inclui o `Authorization`
      httpBodies: [], // o corpo é o cadastro inteiro: CPF, endereço, salário
      urlQueryParams: false, // a busca do usuário
      databaseQueryData: false, // os parâmetros do SQL
    },

    beforeSend: (evento: ErrorEvent, dica: EventHint) =>
      ehIncidente(dica.originalException) ? limparEvento(evento) : null,
  });

  registrar('info', 'monitoramento-iniciado', { ambiente: process.env.NODE_ENV ?? 'development' });
}

/**
 * Envia um erro inesperado, com o mínimo que permite investigá-lo.
 *
 * O órgão vai como **tag**, e não no corpo: tag é o que o painel agrupa e
 * filtra. É a diferença entre "500 erros" e "500 erros, todos da Prefeitura X"
 * — que costuma ser a resposta inteira.
 */
export function reportarErro(
  erro: unknown,
  contexto: { req?: string; rota?: string; orgao?: string | null; usuario?: string | null },
): void {
  if (!monitoramentoAtivo() || !ehIncidente(erro)) return;

  Sentry.withScope((escopo) => {
    escopo.setTag('orgao', contexto.orgao ?? 'sem-orgao');
    escopo.setTag('rota', contexto.rota ?? 'desconhecida');
    escopo.setContext('requisicao', {
      id: contexto.req ?? null,
      // Id do usuário, nunca nome nem e-mail: identifica sem expor.
      usuario: contexto.usuario ?? null,
    });
    Sentry.captureException(erro);
  });
}
