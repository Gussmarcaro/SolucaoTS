import { describe, expect, it } from 'vitest';
import type { ErrorEvent } from '@sentry/node';
import { ehIncidente, limparEvento, monitoramentoAtivo } from '@/shared/monitoramento';
import { AppError, BusinessError, NotFoundError } from '@/shared/errors';

/**
 * Agregação de erros — o que sai daqui para fora.
 *
 * Estes testes não falam com a rede: exercitam as duas funções que decidem
 * **se** um erro sai e **o que** vai junto. São as duas que, erradas, causam
 * dano — uma enche o painel de ruído até ninguém mais olhar, a outra manda
 * dado pessoal de beneficiário de OSC para um serviço de terceiros.
 */

describe('o que conta como incidente', () => {
  it('erro previsto não é incidente', () => {
    // Senha errada, dado inválido e "não encontrado" são o sistema
    // funcionando. No painel, virariam ruído que faz o alerta ser ignorado.
    expect(ehIncidente(new BusinessError('Dado inválido.'))).toBe(false);
    expect(ehIncidente(new NotFoundError())).toBe(false);
    expect(ehIncidente(new AppError('Sem permissão.', 403, 'SEM_PERMISSAO'))).toBe(false);
  });

  it('erro inesperado é incidente', () => {
    expect(ehIncidente(new Error('coluna inexistente'))).toBe(true);
    expect(ehIncidente(new TypeError('undefined is not a function'))).toBe(true);
    expect(ehIncidente('string solta')).toBe(true);
  });
});

describe('a peneira antes do envio', () => {
  const eventoCheio = (): ErrorEvent =>
    ({
      request: {
        method: 'POST',
        url: 'https://api.exemplo/api/entidades/6f1a2b3c-4d5e-4f60-8a9b-0c1d2e3f4a5b?busca=fulano',
        headers: { authorization: 'Bearer abc.def.ghi', cookie: 'sessao=1' },
        data: { cpf: '12345678909', senha: 'segredo' },
        cookies: { sessao: '1' },
      },
      user: { id: 'u1', email: 'fulano@prefeitura.gov.br', ip_address: '200.1.2.3' },
      breadcrumbs: [{ message: 'SELECT * FROM "Usuario" WHERE cpf = 12345678909' }],
      extra: { payload: { senha: 'segredo', ok: 1 } },
    }) as unknown as ErrorEvent;

  it('não deixa passar cabeçalho, corpo nem cookie', () => {
    const e = limparEvento(eventoCheio())!;
    const texto = JSON.stringify(e);

    expect(e.request?.headers).toBeUndefined();
    expect(texto).not.toContain('Bearer');
    expect(texto).not.toContain('12345678909');
    expect(texto).not.toContain('segredo');
    expect(texto).not.toContain('sessao');
  });

  it('não deixa passar identificação de pessoa', () => {
    const e = limparEvento(eventoCheio())!;
    expect(e.user).toBeUndefined();
    expect(JSON.stringify(e)).not.toContain('fulano@prefeitura.gov.br');
    expect(JSON.stringify(e)).not.toContain('200.1.2.3');
  });

  it('descarta a trilha de navegação', () => {
    // Breadcrumb carrega consulta SQL com parâmetro — o caminho mais fácil de
    // um CPF sair sem ninguém perceber.
    const e = limparEvento(eventoCheio())!;
    expect(e.breadcrumbs).toBeUndefined();
  });

  it('guarda a rota normalizada e sem query string', () => {
    const e = limparEvento(eventoCheio())!;
    // O que resta é o que responde a pergunta: qual rota, qual método.
    expect(e.request?.url).toBe('https://api.exemplo/api/entidades/:id');
    expect(e.request?.method).toBe('POST');
    expect(JSON.stringify(e)).not.toContain('busca=fulano');
  });

  it('o que sobra em extra também é peneirado', () => {
    const e = limparEvento(eventoCheio())!;
    const extra = e.extra?.payload as Record<string, unknown>;
    expect(extra.senha).toBe('[oculto]');
    expect(extra.ok).toBe(1);
  });

  it('evento sem requisição não quebra a peneira', () => {
    // Erro de tarefa de fundo (seed, backfill) chega sem `request`.
    expect(() => limparEvento({} as ErrorEvent)).not.toThrow();
  });
});

describe('desligado por padrão', () => {
  it('sem SENTRY_DSN, nada é enviado', () => {
    // Desenvolvimento e a máquina de quem clona o repositório não falam com
    // serviço nenhum — mesmo padrão do assistente sem ANTHROPIC_API_KEY.
    expect(process.env.SENTRY_DSN).toBeUndefined();
    expect(monitoramentoAtivo()).toBe(false);
  });
});
