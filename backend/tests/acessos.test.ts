import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { TEM_BANCO, aplicarSchema, limparBanco, orgaoFake, prepararAmbiente } from './apoio';

/**
 * Histórico de acessos, do login ao logout.
 *
 * `verificar:sessoes` já prova a leitura como função pura — o que ele não
 * alcança é a **corrente**: o login gravar a linha, o id dela voltar dentro do
 * `jti` do token, o middleware de autenticação reencontrá-la para carimbar
 * atividade, o logout fechá-la, e o recorte por órgão valer na consulta.
 *
 * Qualquer elo pode se soltar num refactor sem nada quebrar visivelmente: o
 * sistema continua deixando entrar e sair, e a tela do administrador
 * simplesmente para de registrar quem entrou — ou, pior, passa a registrar os
 * acessos do órgão vizinho.
 */
describe.skipIf(!TEM_BANCO)('histórico de acessos', () => {
  let app: Express;
  let tokenA: string;
  let tokenB: string;

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

    for (const n of [1, 2]) {
      const f = orgaoFake(n);
      await repo.provisionar({
        orgao: f.orgao,
        admin: {
          nome: f.admin.nome,
          email: f.admin.email,
          documento: f.admin.documento,
          senhaHash: await hashSenha(f.admin.senha),
        },
      });
    }

    app = (await import('@/app')).app;

    const entrar = async (n: number) => {
      const f = orgaoFake(n);
      const r = await request(app)
        .post('/api/auth/login')
        .send({ email: f.admin.email, senha: f.admin.senha })
        // O User-Agent tem de atravessar: é metade da resposta a "entraram na
        // minha conta de onde?".
        .set('User-Agent', `NavegadorDeTeste/${n}`);
      expect(r.status).toBe(200);
      return r.body.token as string;
    };

    tokenA = await entrar(1);
    tokenB = await entrar(2);
  });

  it('o login grava a sessão e o token carrega o id dela', async () => {
    const { verificarToken } = await import('@/shared/auth/jwt');
    const payload = verificarToken(tokenA);

    // Sem o `jti` nada mais desta cadeia funciona: nem o carimbo de atividade
    // nem o logout saberiam qual linha tocar.
    expect(payload.jti).toBeTruthy();

    const r = await request(app).get('/api/acessos').set('Authorization', `Bearer ${tokenA}`);
    expect(r.status).toBe(200);
    expect(r.body.total).toBe(1);

    const s = r.body.data[0];
    expect(s.id).toBe(payload.jti);
    expect(s.usuarioNome).toBe(orgaoFake(1).admin.nome);
    expect(s.usuarioEmail).toBe(orgaoFake(1).admin.email);
    expect(s.logoutEm).toBeNull();
    expect(s.navegador).toBe('NavegadorDeTeste/1');
    // Acabou de entrar e acabou de usar o sistema.
    expect(s.situacao).toBe('ABERTA');
  });

  it('um órgão não enxerga os acessos do outro', async () => {
    // A trilha de auditoria já teve exatamente este furo: sem recorte, um
    // administrador lia o histórico do cliente vizinho — aqui, com o nome, o
    // e-mail e o endereço de quem entrou.
    const rA = await request(app).get('/api/acessos').set('Authorization', `Bearer ${tokenA}`);
    const rB = await request(app).get('/api/acessos').set('Authorization', `Bearer ${tokenB}`);

    expect(rA.body.total).toBe(1);
    expect(rB.body.total).toBe(1);
    expect(rA.body.data[0].usuarioEmail).toBe(orgaoFake(1).admin.email);
    expect(rB.body.data[0].usuarioEmail).toBe(orgaoFake(2).admin.email);
  });

  it('o logout fecha a sessão, e só aquela', async () => {
    const saiu = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(saiu.status).toBe(204);

    const rA = await request(app).get('/api/acessos').set('Authorization', `Bearer ${tokenA}`);
    const s = rA.body.data[0];
    expect(s.logoutEm).toBeTruthy();
    expect(s.situacao).toBe('ENCERRADA');

    // A do outro órgão continua intacta: o logout lê o id do próprio token, e
    // não aceita um id pelo corpo — justamente para não haver como encerrar a
    // sessão alheia no histórico.
    const rB = await request(app).get('/api/acessos').set('Authorization', `Bearer ${tokenB}`);
    expect(rB.body.data[0].logoutEm).toBeNull();
  });

  it('repetir o logout não reescreve a hora da saída', async () => {
    const antes = (
      await request(app).get('/api/acessos').set('Authorization', `Bearer ${tokenA}`)
    ).body.data[0].logoutEm;

    await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${tokenA}`);

    const depois = (
      await request(app).get('/api/acessos').set('Authorization', `Bearer ${tokenA}`)
    ).body.data[0].logoutEm;

    // O duplo clique em Sair é o caso comum. Sem o `logoutEm: null` no filtro
    // do `updateMany`, o segundo pedido moveria a hora para a frente.
    expect(depois).toBe(antes);
  });

  it('o filtro por situação recorta no banco', async () => {
    const abertas = await request(app)
      .get('/api/acessos?situacao=ABERTA')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(abertas.body.total).toBe(0);

    const encerradas = await request(app)
      .get('/api/acessos?situacao=ENCERRADA')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(encerradas.body.total).toBe(1);
  });

  it('o histórico não aceita ser alterado nem apagado', async () => {
    // Não é detalhe de implementação: o usuário pediu explicitamente que os
    // registros fossem só de consulta, e a ausência destas rotas é a única
    // garantia que não depende de ninguém lembrar da regra.
    const id = (await request(app).get('/api/acessos').set('Authorization', `Bearer ${tokenA}`))
      .body.data[0].id;

    for (const chamada of [
      request(app).delete(`/api/acessos/${id}`),
      request(app).put(`/api/acessos/${id}`).send({ logoutEm: null }),
      request(app).post('/api/acessos').send({}),
    ]) {
      const r = await chamada.set('Authorization', `Bearer ${tokenA}`);
      expect(r.status).toBe(404);
    }
  });

  it('a trilha de auditoria não registra as sessões', async () => {
    // `SessaoAcesso` está em `NAO_AUDITAR`, e precisa estar: o middleware de
    // autenticação atualiza a atividade uma vez por minuto por sessão ativa, e
    // sem a exclusão a auditoria viraria um log de heartbeat.
    const { prismaGlobal } = await import('@/infrastructure/database/prisma');
    const linhas = await prismaGlobal.registroAuditoria.count({
      where: { entidade: 'SessaoAcesso' },
    });
    expect(linhas).toBe(0);
  });
});
