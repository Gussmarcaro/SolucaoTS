import { beforeEach, describe, expect, it, vi } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';

/**
 * Limites de taxa das rotas públicas.
 *
 * Ao contrário dos testes de isolamento, estes **não precisam de banco**: o que
 * se prova aqui é a configuração do limitador, não o que a rota faz depois. Por
 * isso montamos rotas de mentira que respondem sucesso ou falha sob demanda.
 *
 * A regra que mais importa não é "bloqueia depois de N" — é **o que conta como
 * N**. Um limite que consome cota em login bem-sucedido tranca um escritório
 * inteiro atrás do mesmo IP no meio do expediente.
 *
 * `resetModules` a cada teste porque os limitadores são objetos de módulo com
 * contador próprio: sem isso a cota gasta num teste faltaria no seguinte, e as
 * falhas apareceriam no teste errado.
 */

let app: Express;

beforeEach(async () => {
  vi.resetModules();
  const { limiteLogin, limiteRecuperacao } = await import('@/presentation/middlewares/limites');

  app = express();
  app.post('/falha', limiteLogin, (_req, res) => res.status(401).json({ code: 'CREDENCIAIS' }));
  app.post('/sucesso', limiteLogin, (_req, res) => res.status(200).json({ ok: true }));
  app.post('/recuperar', limiteRecuperacao, (_req, res) => res.status(200).json({ ok: true }));
});

describe('limite de tentativas de login', () => {
  it('permite 10 falhas e barra a 11ª', async () => {
    for (let i = 1; i <= 10; i += 1) {
      const r = await request(app).post('/falha');
      expect(r.status, `tentativa ${i} não deveria ser barrada`).toBe(401);
    }

    const barrada = await request(app).post('/falha');
    expect(barrada.status).toBe(429);
    expect(barrada.body.code).toBe('MUITAS_TENTATIVAS');
    // Mensagem em português e sem detalhe técnico: quem vê é o usuário final.
    expect(barrada.body.message).toMatch(/aguarde/i);
  });

  it('login bem-sucedido não consome cota', async () => {
    // Um escritório inteiro atrás do mesmo IP entrando o dia todo.
    for (let i = 0; i < 30; i += 1) {
      const r = await request(app).post('/sucesso');
      expect(r.status).toBe(200);
    }

    // A cota de falhas continua intacta — é o ponto do `skipSuccessfulRequests`.
    for (let i = 1; i <= 10; i += 1) {
      expect((await request(app).post('/falha')).status, `falha ${i}`).toBe(401);
    }
  });

  it('o erro do limite sai no mesmo formato dos demais', async () => {
    for (let i = 0; i < 11; i += 1) await request(app).post('/falha');

    const r = await request(app).post('/falha');
    // `{ code, message }` é o contrato que o `errorHandler` usa e que o
    // `extrairMensagemErro` do frontend sabe ler.
    expect(Object.keys(r.body).sort()).toEqual(['code', 'message']);
  });

  it('anuncia o limite nos cabeçalhos padrão', async () => {
    const r = await request(app).post('/falha');
    expect(r.headers['ratelimit-policy'] ?? r.headers['ratelimit']).toBeDefined();
    // Os cabeçalhos antigos (X-RateLimit-*) ficam desligados de propósito.
    expect(r.headers['x-ratelimit-limit']).toBeUndefined();
  });
});

describe('limite de recuperação de senha', () => {
  it('permite 5 pedidos e barra o 6º, contando os que dão certo', async () => {
    for (let i = 1; i <= 5; i += 1) {
      const r = await request(app).post('/recuperar');
      expect(r.status, `pedido ${i}`).toBe(200);
    }

    // Aqui o sucesso conta, e tem de contar: é justamente o pedido bem-sucedido
    // que dispara o e-mail na caixa de outra pessoa.
    const barrado = await request(app).post('/recuperar');
    expect(barrado.status).toBe(429);
  });

  it('login e recuperação têm cotas separadas', async () => {
    for (let i = 0; i < 6; i += 1) await request(app).post('/recuperar');

    // Esgotar a recuperação não pode impedir alguém de tentar entrar.
    const r = await request(app).post('/falha');
    expect(r.status).toBe(401);
  });
});
