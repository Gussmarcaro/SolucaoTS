import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { normalizarRota, ocultarSensiveis, registrar } from '@/shared/log';
import { registrarRequisicao } from '@/presentation/middlewares/registrarRequisicao';
import { errorHandler } from '@/presentation/middlewares/errorHandler';
import { BusinessError } from '@/shared/errors';

/**
 * Log estruturado e linha por requisição. Sem banco.
 *
 * O que se prova aqui é o que o log **carrega** — porque um log que existe mas
 * não tem o órgão, ou que tem o CPF, é pior que não ter: no primeiro caso não
 * responde a pergunta, no segundo cria um problema de LGPD onde não havia.
 */

let linhas: Record<string, unknown>[];
let erros: Record<string, unknown>[];

beforeEach(() => {
  linhas = [];
  erros = [];
  vi.spyOn(console, 'log').mockImplementation((l: string) => void linhas.push(JSON.parse(l)));
  vi.spyOn(console, 'error').mockImplementation((l: string) => void erros.push(JSON.parse(l)));
});

afterEach(() => vi.restoreAllMocks());

function appDeTeste(): Express {
  const app = express();
  app.use(registrarRequisicao);
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/ok', (_req, res) => res.json({ ok: true }));
  app.get('/api/prestacoes/:id/json', (_req, res) => res.json({ ok: true }));
  app.get('/api/recusa', (_req, _res, next) => next(new BusinessError('Dado inválido.')));
  app.get('/api/quebra', () => {
    throw new Error('coluna inexistente');
  });
  app.use(errorHandler);
  return app;
}

describe('linha por requisição', () => {
  it('registra método, rota, status e duração', async () => {
    await request(appDeTeste()).get('/api/ok');

    expect(linhas).toHaveLength(1);
    const l = linhas[0];
    expect(l.evento).toBe('requisicao');
    expect(l.nivel).toBe('info');
    expect(l.metodo).toBe('GET');
    expect(l.rota).toBe('/api/ok');
    expect(l.status).toBe(200);
    expect(typeof l.ms).toBe('number');
    expect(typeof l.req).toBe('string');
  });

  it('o healthcheck não polui o log', async () => {
    await request(appDeTeste()).get('/api/health');
    // O Render bate de minuto em minuto; registrar isso enterraria o resto.
    expect(linhas).toHaveLength(0);
    expect(erros).toHaveLength(0);
  });

  it('4xx é aviso e 5xx é erro', async () => {
    await request(appDeTeste()).get('/api/recusa');
    expect(erros.find((l) => l.evento === 'requisicao')?.nivel).toBe('aviso');

    erros.length = 0;
    await request(appDeTeste()).get('/api/quebra');
    expect(erros.find((l) => l.evento === 'requisicao')?.nivel).toBe('erro');
  });

  it('carrega o órgão quando há sessão', async () => {
    const app = express();
    app.use(registrarRequisicao);
    // Finge o que o `autenticar` faz depois de validar o token.
    app.use((req, _res, next) => {
      req.usuario = { id: 'u1', nome: 'Fulano', email: 'f@t.local', grupo: 'Administrador', clienteId: 'org-9', suporte: false };
      next();
    });
    app.get('/api/ok', (_req, res) => res.json({ ok: true }));

    await request(app).get('/api/ok');
    // É o campo que separa "algo falhou" de "algo falhou para a Prefeitura X".
    expect(linhas[0].orgao).toBe('org-9');
    expect(linhas[0].usuario).toBe('u1');
  });

  it('sem sessão, órgão e usuário ficam nulos em vez de ausentes', async () => {
    await request(appDeTeste()).get('/api/ok');
    expect(linhas[0]).toHaveProperty('orgao', null);
    expect(linhas[0]).toHaveProperty('usuario', null);
  });
});

describe('erro inesperado', () => {
  it('registra uma linha própria, com o stack recortado', async () => {
    await request(appDeTeste()).get('/api/quebra');

    const l = erros.find((x) => x.evento === 'erro-inesperado');
    expect(l).toBeDefined();
    expect(l!.erro).toBe('coluna inexistente');
    expect(String(l!.stack).split('\n').length).toBeLessThanOrEqual(6);
  });

  it('devolve o id da requisição ao usuário', async () => {
    const r = await request(appDeTeste()).get('/api/quebra');

    expect(r.status).toBe(500);
    // É o que transforma "não funcionou ontem" numa busca de um segundo.
    expect(r.body.requisicaoId).toBeTruthy();
    expect(erros.find((x) => x.evento === 'erro-inesperado')!.req).toBe(r.body.requisicaoId);
  });

  it('recusa prevista não vira linha de erro', async () => {
    await request(appDeTeste()).get('/api/recusa');
    // Senha errada e dado inválido são uso normal; se virassem erro, a
    // investigação de verdade ficaria enterrada no ruído.
    expect(erros.some((l) => l.evento === 'erro-inesperado')).toBe(false);
  });
});

describe('o que nunca entra no log', () => {
  it('oculta senha, token e documento em qualquer profundidade', () => {
    const limpo = ocultarSensiveis({
      email: 'a@b.c',
      senha: 'segredo',
      usuario: { cpf: '12345678909', nome: 'Fulano', interno: { token: 'abc' } },
    }) as Record<string, unknown>;

    expect(limpo.email).toBe('a@b.c');
    expect(limpo.senha).toBe('[oculto]');
    const u = limpo.usuario as Record<string, unknown>;
    expect(u.cpf).toBe('[oculto]');
    expect(u.nome).toBe('Fulano');
    expect((u.interno as Record<string, unknown>).token).toBe('[oculto]');
  });

  it('a ocultação vale para o que for registrado direto', () => {
    registrar('info', 'teste', { senha: 'segredo', ok: 1 });
    expect(linhas[0].senha).toBe('[oculto]');
    expect(linhas[0].ok).toBe(1);
  });
});

describe('agrupamento de rotas', () => {
  it('identificador na URL vira :id', async () => {
    await request(appDeTeste()).get('/api/prestacoes/6f1a2b3c-4d5e-4f60-8a9b-0c1d2e3f4a5b/json');
    // Sem isso, cada requisição vira uma "rota" distinta e não há o que agrupar.
    expect(linhas[0].rota).toBe('/api/prestacoes/:id/json');
  });

  it('a query string fica de fora', async () => {
    await request(appDeTeste()).get('/api/ok?busca=fulano&cpf=12345678909');
    // A busca do usuário pode conter dado pessoal — e não ajuda a agrupar.
    expect(linhas[0].rota).toBe('/api/ok');
  });

  it('normalizarRota também cobre id numérico longo', () => {
    expect(normalizarRota('/api/exercicios/2025/itens/123456')).toBe('/api/exercicios/:n/itens/:n');
  });
});
