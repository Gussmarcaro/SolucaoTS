import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import {
  TEM_BANCO,
  aplicarSchema,
  limparBanco,
  orgaoFake,
  prepararAmbiente,
} from './apoio';

/**
 * Isolamento multi-tenant, de ponta a ponta.
 *
 * `verificar:tenant` já prova a regra do filtro como função pura. O que **só**
 * um teste assim prova é a ligação inteira: o claim `cli` do token chegar ao
 * `AsyncLocalStorage`, sobreviver aos `await` do caminho, as duas extensions
 * empilhadas na ordem certa, e o SQL sair com o recorte. Qualquer um desses
 * elos pode se soltar num refactor sem que nada quebre visivelmente — o sistema
 * continua funcionando, e vazando.
 *
 * Por isso os cenários abaixo são todos da forma "o órgão B **não** enxerga o
 * que é do A". Testar que A enxerga o que é seu passaria mesmo sem filtro
 * nenhum.
 */
describe.skipIf(!TEM_BANCO)('isolamento entre órgãos', () => {
  let app: Express;
  let tokenA: string;
  let tokenB: string;
  let fornecedorDeA: string;
  let orgaoIdA: string;

  beforeAll(async () => {
    prepararAmbiente();
    aplicarSchema();

    const { prismaGlobal } = await import('@/infrastructure/database/prisma');
    await limparBanco(prismaGlobal);

    const { PrismaSuporteRepository } = await import(
      '@/infrastructure/database/PrismaSuporteRepository'
    );
    const { hashSenha } = await import('@/shared/auth/senha');
    const repo = new PrismaSuporteRepository();

    // Dois órgãos completos, pelo mesmo caminho do provisionamento real.
    for (const n of [1, 2]) {
      const f = orgaoFake(n);
      const r = await repo.provisionar({
        orgao: f.orgao,
        admin: {
          nome: f.admin.nome,
          email: f.admin.email,
          documento: f.admin.documento,
          senhaHash: await hashSenha(f.admin.senha),
        },
      });
      if (n === 1) orgaoIdA = r.clienteId;
    }

    app = (await import('@/app')).app;

    const entrar = async (n: number) => {
      const f = orgaoFake(n);
      const r = await request(app)
        .post('/api/auth/login')
        .send({ email: f.admin.email, senha: f.admin.senha });
      expect(r.status, `login do órgão ${n}: ${JSON.stringify(r.body)}`).toBe(200);
      return r.body.token as string;
    };

    tokenA = await entrar(1);
    tokenB = await entrar(2);

    // Um fornecedor do órgão A — o alvo de todas as tentativas de B.
    const criado = await request(app)
      .post('/api/fornecedores')
      .set('authorization', `Bearer ${tokenA}`)
      .send({
        nome: 'FORNECEDOR EXCLUSIVO DO A',
        documento: '11222333000181',
        documentoTipo: 'CNPJ',
        cep: '01001000',
        logradouro: 'Praca da Se',
        bairro: 'Se',
        cidade: 'Sao Paulo',
        uf: 'SP',
        email: 'contato@fornecedor-a.test',
      });
    expect(criado.status, JSON.stringify(criado.body)).toBe(201);
    fornecedorDeA = criado.body.id;
  });

  it('o token carrega o órgão do usuário', async () => {
    const r = await request(app).get('/api/fornecedores').set('authorization', `Bearer ${tokenA}`);
    expect(r.status).toBe(200);
    expect(r.body.data).toHaveLength(1);
  });

  it('o registro nasce carimbado com o órgão de quem criou', async () => {
    const { prismaGlobal } = await import('@/infrastructure/database/prisma');
    const linha = await prismaGlobal.fornecedor.findUnique({ where: { id: fornecedorDeA } });
    expect(linha?.clienteId).toBe(orgaoIdA);
  });

  it('a listagem de B não traz o fornecedor de A', async () => {
    const r = await request(app).get('/api/fornecedores').set('authorization', `Bearer ${tokenB}`);
    expect(r.status).toBe(200);
    expect(r.body.data).toHaveLength(0);
    expect(r.body.total).toBe(0);
  });

  it('a busca por id do fornecedor de A responde 404 para B', async () => {
    const r = await request(app)
      .get(`/api/fornecedores/${fornecedorDeA}`)
      .set('authorization', `Bearer ${tokenB}`);
    // 404 e não 403: dizer "proibido" confirmaria que o registro existe.
    expect(r.status).toBe(404);
  });

  it('B não consegue alterar o fornecedor de A', async () => {
    const r = await request(app)
      .put(`/api/fornecedores/${fornecedorDeA}`)
      .set('authorization', `Bearer ${tokenB}`)
      .send({
        nome: 'SEQUESTRADO POR B',
        documento: '11222333000181',
        documentoTipo: 'CNPJ',
        cep: '01001000',
        logradouro: 'Praca da Se',
        bairro: 'Se',
        cidade: 'Sao Paulo',
        uf: 'SP',
        email: 'contato@fornecedor-a.test',
      });
    expect(r.status).toBeGreaterThanOrEqual(400);

    const { prismaGlobal } = await import('@/infrastructure/database/prisma');
    const linha = await prismaGlobal.fornecedor.findUnique({ where: { id: fornecedorDeA } });
    expect(linha?.nome).toBe('FORNECEDOR EXCLUSIVO DO A');
  });

  it('a busca global de B não encontra dados de A', async () => {
    const r = await request(app)
      .get('/api/busca')
      .query({ q: 'EXCLUSIVO' })
      .set('authorization', `Bearer ${tokenB}`);
    expect(r.status).toBe(200);
    const texto = JSON.stringify(r.body);
    expect(texto).not.toContain('EXCLUSIVO DO A');
  });

  it('cada órgão só enxerga a si mesmo em /orgaos', async () => {
    const r = await request(app).get('/api/orgaos').set('authorization', `Bearer ${tokenA}`);
    expect(r.status).toBe(200);
    expect(r.body.data).toHaveLength(1);
    expect(r.body.data[0].id).toBe(orgaoIdA);
  });

  it('a contagem não soma os registros do outro órgão', async () => {
    // O total da grade sai de um `count` — que é filtrado por um caminho
    // diferente do `findMany`, e por isso merece asserção própria.
    const r = await request(app)
      .get('/api/fornecedores')
      .query({ pageSize: 1 })
      .set('authorization', `Bearer ${tokenB}`);
    expect(r.body.total).toBe(0);
  });

  it('B não vê os usuários de A', async () => {
    const r = await request(app).get('/api/usuarios').set('authorization', `Bearer ${tokenB}`);
    expect(r.status).toBe(200);
    const emails = (r.body.data as { email: string }[]).map((u) => u.email);
    expect(emails).toContain(orgaoFake(2).admin.email);
    expect(emails).not.toContain(orgaoFake(1).admin.email);
  });

  it('sem token, nada responde', async () => {
    const r = await request(app).get('/api/fornecedores');
    expect(r.status).toBe(401);
  });

  it('as rotas de suporte respondem 404 a quem não é do suporte', async () => {
    // 404 em vez de 403 de propósito: 403 confirmaria que existe uma
    // administração global do sistema.
    const r = await request(app).get('/api/suporte/orgaos').set('authorization', `Bearer ${tokenA}`);
    expect(r.status).toBe(404);
  });
});

describe.skipIf(TEM_BANCO)('isolamento entre órgãos', () => {
  it('pulado — defina DATABASE_URL_TEST para rodar', () => {
    expect(TEM_BANCO).toBe(false);
  });
});
