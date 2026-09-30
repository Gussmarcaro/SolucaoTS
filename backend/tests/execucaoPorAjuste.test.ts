import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { TEM_BANCO, aplicarSchema, limparBanco, orgaoFake, prepararAmbiente } from './apoio';

/**
 * A Execução acontece dentro de um ajuste — de ponta a ponta.
 *
 * O typecheck garante que o parâmetro existe; **nada** garantia que ele chega
 * ao SQL. Entre a tela e a linha do banco há o controller lendo a query, o caso
 * de uso repassando, o repositório montando o `where` e as duas extensions do
 * Prisma empilhadas por cima — e qualquer um desses elos pode se soltar num
 * refactor sem nada quebrar visivelmente: a tela continua funcionando, e
 * mostrando a despesa da parceria errada.
 *
 * O cenário é sempre da forma "o ajuste B **não** enxerga o que é do A".
 * Testar que A enxerga o que é seu passaria mesmo sem filtro nenhum.
 *
 * **A nota rateada é o caso que justifica o arquivo.** Ela pertence aos dois
 * ajustes ao mesmo tempo, e é a única coisa aqui que um filtro ingênuo por
 * `ajusteId` esconderia de todo mundo.
 */
describe.skipIf(!TEM_BANCO)('execução recortada por ajuste', () => {
  let app: Express;
  let token: string;
  let ajusteA: string;
  let ajusteB: string;
  let rateioId: string;

  const get = async (url: string) => {
    const r = await request(app).get(url).set('Authorization', `Bearer ${token}`);
    expect(r.status, `GET ${url}: ${JSON.stringify(r.body)}`).toBe(200);
    return r.body;
  };

  const criado = async (url: string, body: unknown) => {
    const r = await request(app).post(url).set('Authorization', `Bearer ${token}`).send(body);
    expect(r.status, `POST ${url}: ${JSON.stringify(r.body)}`).toBe(201);
    return r.body;
  };

  beforeAll(async () => {
    prepararAmbiente();
    aplicarSchema();

    const { prismaGlobal } = await import('@/infrastructure/database/prisma');
    await limparBanco(prismaGlobal);

    const { PrismaSuporteRepository } = await import(
      '@/infrastructure/database/PrismaSuporteRepository'
    );
    const { hashSenha } = await import('@/shared/auth/senha');

    const f = orgaoFake(1);
    await new PrismaSuporteRepository().provisionar({
      orgao: f.orgao,
      admin: {
        nome: f.admin.nome,
        email: f.admin.email,
        documento: f.admin.documento,
        senhaHash: await hashSenha(f.admin.senha),
      },
    });

    app = (await import('@/app')).app;

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: f.admin.email, senha: f.admin.senha });
    expect(login.status, `login: ${JSON.stringify(login.body)}`).toBe(200);
    token = login.body.token;

    // Uma OSC e **dois** ajustes dela: é o caso real em que o erro dói, porque
    // as duas parcerias compartilham entidade, fornecedores e conta bancária.
    const entidade = await criado('/api/entidades', {
      razaoSocial: 'ASSOCIAÇÃO VIDA E SAÚDE',
      cnpj: '44555666000181',
      cep: '01001000',
      logradouro: 'Praça da Sé',
      bairro: 'Sé',
      cidade: 'São Paulo',
      uf: 'SP',
      email: 'contato@vidaesaude.org.br',
    });

    const novoAjuste = async (codigo: string, objeto: string) =>
      (
        await criado('/api/ajustes', {
          entidadeBeneficiariaId: entidade.id,
          tipoAjuste: 'CONVENIO',
          codigoAjuste: codigo,
          objeto,
          valorGlobal: 500000,
          dataAssinatura: '2026-01-10',
          vigenciaInicial: '2026-01-15',
          vigenciaFinal: '2026-12-31',
          periodicidade: 'ANUAL',
          fontesRecurso: [1],
        })
      ).id;

    ajusteA = await novoAjuste('2026000000000001', 'Plantão médico');
    ajusteB = await novoAjuste('2026000000000002', 'Alta complexidade');

    // O rateio que inclui os dois: é ele que faz a nota da sede pertencer a
    // ambos, e sem quadro não há nota rateada para testar.
    rateioId = (
      await criado('/api/rateios', {
        titulo: 'RATEIO ADMINISTRATIVO SEDE',
        metodo: 'RECEITA',
        vigenciaInicio: '2026-01-01',
        vigenciaFim: '2026-12-31',
        participantes: [
          { ajusteId: ajusteA, base: 75 },
          { ajusteId: ajusteB, base: 25 },
        ],
      })
    ).id;
  });

  it('a despesa lançada num ajuste não aparece no outro', async () => {
    await criado('/api/despesas', {
      ajusteId: ajusteA,
      numero: 'NF-100',
      credorTipoDoc: 'CNPJ',
      credorNumeroDoc: '44555666000181',
      credorNome: 'PAPELARIA MATERIAL PRA TODOS LTDA',
      descricao: 'Material de escritório do plantão',
      dataEmissao: '2026-03-10',
      valorBruto: 1000,
      valorEncargos: 0,
      categoriaDespesaTipo: 3,
    });

    const deA = await get(`/api/despesas?ajusteId=${ajusteA}`);
    const deB = await get(`/api/despesas?ajusteId=${ajusteB}`);

    expect(deA.map((d: { numero: string }) => d.numero)).toContain('NF-100');
    expect(deB.map((d: { numero: string }) => d.numero)).not.toContain('NF-100');
  });

  it('a nota rateada aparece nos dois ajustes do quadro', async () => {
    /*
     * O caso que um filtro ingênuo quebraria.
     *
     * A despesa da sede acontece uma vez e é paga pelas duas parcerias.
     * `DocumentoFiscal.ajusteId` fica nulo nela — gravar um dos dois escolheria
     * um dono arbitrário — e a listagem a alcança pelo quadro do rateio. Sem
     * esse braço, ela sumiria de **todo mundo**, que é o modo de falhar mais
     * caro: a despesa existe, ninguém a vê, e ela não entra em prestação
     * nenhuma.
     */
    await criado('/api/despesas', {
      ajusteId: ajusteA, // o servidor descarta: nota rateada não tem dono único
      numero: 'NF-SEDE-200',
      credorTipoDoc: 'CNPJ',
      credorNumeroDoc: '44555666000181',
      credorNome: 'ENERGIA SA',
      descricao: 'Energia elétrica da sede',
      dataEmissao: '2026-03-20',
      valorBruto: 800,
      valorEncargos: 0,
      categoriaDespesaTipo: 3,
      rateioProveniente: true,
      rateioId,
    });

    const deA = await get(`/api/despesas?ajusteId=${ajusteA}`);
    const deB = await get(`/api/despesas?ajusteId=${ajusteB}`);

    expect(deA.map((d: { numero: string }) => d.numero)).toContain('NF-SEDE-200');
    expect(deB.map((d: { numero: string }) => d.numero)).toContain('NF-SEDE-200');

    // E o dono não foi escolhido no chute: continua nulo.
    const nota = deA.find((d: { numero: string }) => d.numero === 'NF-SEDE-200');
    expect(nota.ajusteId).toBeNull();
  });

  it('o pagamento lançado num ajuste não aparece no outro', async () => {
    const docs = await get(`/api/despesas?ajusteId=${ajusteA}`);
    const nf = docs.find((d: { numero: string }) => d.numero === 'NF-100');

    await criado('/api/pagamentos', {
      ajusteId: ajusteA,
      documentoFiscalId: nf.id,
      dataPagamento: '2026-03-15',
      valor: 1000,
      fonteRecursoTipo: 1,
      meioPagamento: 'BANCO',
      banco: 1,
      agencia: 1478,
      contaCorrente: '123655-9',
    });

    const emA = await get(`/api/pagamentos?ajusteId=${ajusteA}`);
    const emB = await get(`/api/pagamentos?ajusteId=${ajusteB}`);

    expect(emA).toHaveLength(1);
    expect(emB).toHaveLength(0);
  });

  it('o pagamento da nota rateada é limitado à parcela do ajuste', async () => {
    /*
     * A regra que impede a despesa de uma parceria entrar na prestação da
     * outra. A nota de R$ 800,00 dividida 75/25 dá R$ 600,00 para A e
     * R$ 200,00 para B — e o saldo da nota (R$ 800,00) **não** serve de teto,
     * senão A pagaria a parte de B e a nota fecharia certinho.
     */
    const docs = await get(`/api/despesas?ajusteId=${ajusteA}`);
    const sede = docs.find((d: { numero: string }) => d.numero === 'NF-SEDE-200');

    const base = {
      documentoFiscalId: sede.id,
      dataPagamento: '2026-03-25',
      fonteRecursoTipo: 1,
      meioPagamento: 'BANCO',
      banco: 1,
      agencia: 1478,
      contaCorrente: '123655-9',
    };

    const demais = await request(app)
      .post('/api/pagamentos')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...base, ajusteId: ajusteA, valor: 700 });
    expect(demais.status, JSON.stringify(demais.body)).toBe(422);
    expect(String(demais.body.message)).toMatch(/parte deste ajuste/i);

    // A parcela exata passa.
    await criado('/api/pagamentos', { ...base, ajusteId: ajusteA, valor: 600 });

    // E a de B continua disponível, porque é dinheiro dela.
    await criado('/api/pagamentos', { ...base, ajusteId: ajusteB, valor: 200 });
  });

  it('a receita lançada num ajuste não aparece no outro', async () => {
    const conta = await criado('/api/contas-bancarias', {
      banco: 1,
      agencia: '1478',
      conta: '123655-9',
      contaTipo: 1,
      fonteRecursoTipo: 1,
      apelido: 'Conta do convênio',
    });

    await criado('/api/receitas', {
      ajusteId: ajusteA,
      tipo: 'REPASSE_RECEBIDO',
      contaBancariaId: conta.id,
      dataRepasse: '2026-02-10',
      valor: 50000,
    });

    const emA = await get(`/api/receitas?ajusteId=${ajusteA}`);
    const emB = await get(`/api/receitas?ajusteId=${ajusteB}`);

    expect(emA).toHaveLength(1);
    expect(emB).toHaveLength(0);
    // A fonte veio da conta, não do payload — ver `resolverConta`.
    expect(emA[0].fonteRecursoTipo).toBe(1);
  });

  it('a conciliação só oferece os lançamentos do ajuste', async () => {
    const deA = await get(
      `/api/conciliacao/pendentes?de=2026-01-01&ate=2026-12-31&ajusteId=${ajusteA}`,
    );
    const deB = await get(
      `/api/conciliacao/pendentes?de=2026-01-01&ate=2026-12-31&ajusteId=${ajusteB}`,
    );

    // A tem pagamentos e a receita; B tem só o pagamento da parcela dele.
    expect(deA.length).toBeGreaterThan(deB.length);
    expect(deB).toHaveLength(1);
    expect(deB[0].tipo).toBe('PAGAMENTO');
  });
});

describe.skipIf(TEM_BANCO)('execução recortada por ajuste', () => {
  it('pulado: defina DATABASE_URL_TEST para rodar', () => {
    expect(true).toBe(true);
  });
});
