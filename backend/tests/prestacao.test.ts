import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { TEM_BANCO, aplicarSchema, limparBanco, orgaoFake, prepararAmbiente } from './apoio';

/**
 * O caminho da prestação, do formulário ao documento que vai ao Tribunal.
 *
 * **O que só este teste prova.** `verificar:montador` já exercita o montador
 * contra o JSON Schema oficial nos 5 tipos de ajuste, e quebra o documento de
 * 15 formas para conferir que cada regra barra — mas parte de um
 * `DadosMontagem` sintético, escrito à mão. Ninguém provava que o que **sai do
 * banco** chega naquele formato.
 *
 * É a lacuna cara do sistema: entre a nota que o usuário digitou e o
 * `documentoJSON` que o TCESP recebe há um repositório com trinta `select`, um
 * `toDomain` por bloco e um montador. Um campo que pare de ser carregado
 * atravessa os onze `verificar:*` sem acusar nada — o documento sai válido,
 * é aceito, e volta como inconformidade meses depois. Aqui o valor é digitado
 * de um lado e conferido do outro.
 *
 * Por isso as asserções são sempre sobre o **valor**, nunca sobre a existência
 * do bloco: `documentos_fiscais` com um item vazio passaria num teste que só
 * conta o tamanho da lista.
 */
describe.skipIf(!TEM_BANCO)('a prestação, do cadastro ao documento JSON', () => {
  let app: Express;
  let token: string;
  let prestacaoId: string;
  let ajusteId: string;

  /** O que entra pela API — e o que tem de sair no documento, igual. */
  const NOTA = {
    numero: '000123',
    credorNumeroDoc: '11222333000181',
    credorNome: 'PAPELARIA CENTRAL LTDA',
    descricao: 'Material de escritório',
    dataEmissao: '2025-03-14',
    valorBruto: 4.56, // dízima do `multipleOf: 0.01`: ver o adapter do Ajv
    categoriaDespesaTipo: 1,
  };
  const REPASSE = { valor: 1522632.45, dataRepasse: '2025-02-10', fonteRecursoTipo: 1 };
  const CONTA = { banco: 341, agencia: 1234, conta: '56789-0', contaTipo: 1 };
  const CODIGO_AJUSTE = '2025000000000042';
  const ANO = 2025;

  const post = (url: string, corpo: unknown) =>
    request(app).post(url).set('Authorization', `Bearer ${token}`).send(corpo);
  const get = (url: string) => request(app).get(url).set('Authorization', `Bearer ${token}`);

  /** Falha dizendo **o que** o servidor respondeu — senão sobra "esperava 201". */
  const criado = async (url: string, corpo: unknown) => {
    const r = await post(url, corpo);
    expect(r.status, `POST ${url} → ${r.status}: ${JSON.stringify(r.body)}`).toBe(201);
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

    // A OSC, o ajuste e a prestação — o caminho que o usuário percorre.
    // CNPJ com dígito verificador válido: o cadastro confere, e um número
    // inventado é recusado com 400 antes de chegar ao banco.
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

    const ajuste = await criado('/api/ajustes', {
      entidadeBeneficiariaId: entidade.id,
      tipoAjuste: 'TERMO_COLABORACAO',
      codigoAjuste: CODIGO_AJUSTE,
      objeto: 'Atendimento socioassistencial a crianças e adolescentes',
      valorGlobal: 2000000,
      dataAssinatura: '2025-01-15',
      vigenciaInicial: '2025-01-20',
      vigenciaFinal: '2025-12-31',
      periodicidade: 'ANUAL',
      // Obrigatória: o ajuste sem fonte de recurso é recusado, e o código é
      // conferido contra a tabela oficial — não basta ser número.
      fontesRecurso: [1],
    });
    ajusteId = ajuste.id;

    const prestacao = await criado('/api/prestacoes', { ajusteId, ano: ANO });
    prestacaoId = prestacao.id;
  });

  /*
   * A conferência antes de qualquer lançamento.
   *
   * Não é detalhe de ordem: a prestação recém-criada é exatamente o caso que o
   * JSON Schema aceita e o Tribunal rejeita meses depois. Se este cenário
   * deixar de apontar pendência, o painel "está pronta?" passou a mentir — e
   * mentir para o lado que não se percebe.
   */
  it('reconhece a prestação vazia como não pronta', async () => {
    const r = await get(`/api/prestacoes/${prestacaoId}/conferencia`);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.pronta).toBe(false);

    const titulos = (r.body.pendencias as Array<{ titulo: string }>).map((p) => p.titulo).join(' | ');
    expect(titulos).toMatch(/documento fiscal/i);
    expect(titulos).toMatch(/pagamento/i);
    expect(titulos).toMatch(/receita|repasse/i);
  });

  it('não aponta como pendência o que é legitimamente vazio', async () => {
    const r = await get(`/api/prestacoes/${prestacaoId}/conferencia`);
    const titulos = (r.body.pendencias as Array<{ titulo: string }>).map((p) => p.titulo).join(' | ');

    // Desconto, devolução, glosa e bem cedido são zero numa parceria que correu
    // bem. Apontá-los ensinaria a ignorar o painel — que é a única coisa que um
    // painel de pendências não pode fazer.
    expect(titulos).not.toMatch(/desconto/i);
    expect(titulos).not.toMatch(/devolu/i);
    expect(titulos).not.toMatch(/glosa/i);
    expect(titulos).not.toMatch(/bem cedido|bens cedidos/i);
  });

  it('leva a nota digitada até o documento, com os mesmos valores', async () => {
    /*
     * O caminho real, e ele tem duas etapas.
     *
     * A nota é **do órgão**, não da prestação: nasce em Execução → Despesas e
     * só depois é **apropriada** à prestação do exercício. Quem carrega o
     * vínculo é `PrestacaoDocumentoFiscal`, e é dela que o montador lê — a
     * mesma nota rateada alimenta várias prestações com percentuais
     * diferentes, e o percentual é da ligação, não da nota.
     *
     * Lançar direto na prestação (a rota antiga, `POST
     * /prestacoes/:id/documentos-fiscais`) grava a nota sem a ligação, e ela
     * não chega ao documento transmitido.
     */
    const nota = await criado('/api/despesas', {
      numero: NOTA.numero,
      credorTipoDoc: 'CNPJ',
      credorNumeroDoc: NOTA.credorNumeroDoc,
      credorNome: NOTA.credorNome,
      descricao: NOTA.descricao,
      dataEmissao: NOTA.dataEmissao,
      valorBruto: NOTA.valorBruto,
      categoriaDespesaTipo: NOTA.categoriaDespesaTipo,
    });

    const ap = await post(
      `/api/prestacoes/${prestacaoId}/documentos-fiscais/${nota.id}/apropriar`,
      {},
    );
    expect(ap.status, `apropriar → ${ap.status}: ${JSON.stringify(ap.body)}`).toBeLessThan(300);

    const r = await get(`/api/prestacoes/${prestacaoId}/json`);
    expect(r.status, JSON.stringify(r.body)).toBe(200);

    const notas = r.body.documento.documentos_fiscais as Array<Record<string, any>>;
    expect(notas).toHaveLength(1);

    // Campo a campo, e não `toMatchObject` do objeto inteiro: o que se quer
    // saber é *qual* deles se perdeu, não que "algo" não bate.
    expect(notas[0].numero).toBe(NOTA.numero);
    expect(notas[0].descricao).toBe(NOTA.descricao);
    expect(notas[0].data_emissao).toBe(NOTA.dataEmissao);
    expect(notas[0].valor_bruto).toBe(NOTA.valorBruto);
    expect(notas[0].categoria_despesas_tipo).toBe(NOTA.categoriaDespesaTipo);

    // O credor vai aninhado, com o tipo traduzido para o código do TCESP.
    expect(notas[0].credor.documento_numero).toBe(NOTA.credorNumeroDoc);
    expect(notas[0].credor.nome).toBe(NOTA.credorNome);

    // Nota sem contrato **não** leva `identificacao_contrato`: o schema exige
    // os três campos juntos, então metade do objeto seria recusada.
    expect(notas[0].identificacao_contrato).toBeUndefined();
  });

  it('leva o repasse e o saldo, incluindo o fundo fixo', async () => {
    await criado(`/api/prestacoes/${prestacaoId}/receitas`, {
      tipo: 'REPASSE_RECEBIDO',
      dataRepasse: REPASSE.dataRepasse,
      valor: REPASSE.valor,
      fonteRecursoTipo: REPASSE.fonteRecursoTipo,
    });

    await criado(`/api/prestacoes/${prestacaoId}/disponibilidades`, {
      ...CONTA,
      saldoBancario: 1000,
      saldoContabil: 1000,
    });

    const r = await get(`/api/prestacoes/${prestacaoId}/json`);
    const doc = r.body.documento;

    const repasses = doc.receitas.repasses_recebidos as Array<Record<string, any>>;
    expect(repasses).toHaveLength(1);
    expect(repasses[0].valor).toBe(REPASSE.valor);
    expect(repasses[0].data_repasse).toBe(REPASSE.dataRepasse);
    expect(repasses[0].fonte_recurso_tipo).toBe(REPASSE.fonteRecursoTipo);

    const saldos = doc.disponibilidades.saldos as Array<Record<string, any>>;
    expect(saldos).toHaveLength(1);
    expect(saldos[0].banco).toBe(CONTA.banco);
    expect(saldos[0].conta).toBe(CONTA.conta);
    expect(saldos[0].conta_tipo).toBe(CONTA.contaTipo);

    /*
     * `saldo_fundo_fixo` é obrigatório no schema e mora **fora** de `saldos`.
     * Foi um dos dois campos que o `verificar:montador` revelou faltando — e
     * some sem barulho, porque o `limpo()` do montador remove nulos: o campo
     * não preenchido simplesmente não aparece no JSON, e vira rejeição.
     */
    expect(doc.disponibilidades.saldo_fundo_fixo).toBeDefined();
    expect(typeof doc.disponibilidades.saldo_fundo_fixo).toBe('number');
  });

  it('monta o descritor com os códigos do órgão e o ajuste da prestação', async () => {
    const r = await get(`/api/prestacoes/${prestacaoId}/json`);
    const doc = r.body.documento;
    const f = orgaoFake(1);

    // O descritor é o que o Tribunal usa para saber de quem é o documento. Ele
    // atravessa três saltos — prestação → ajuste → cliente —, e é o caminho
    // mais comprido do montador.
    expect(doc.descritor.municipio).toBe(f.orgao.codigoMunicipio);
    expect(doc.descritor.entidade).toBe(f.orgao.codigoEntidade);
    expect(doc.descritor.ano).toBe(ANO);
    // Prestação anual e consolidada: o manual fixa `mes = 12`.
    expect(doc.descritor.mes).toBe(12);
    expect(doc.codigo_ajuste).toBe(CODIGO_AJUSTE);
    // Só sai quando é retificação — presente sempre diria o contrário.
    expect(doc.retificacao).toBeUndefined();
  });

  it('a pendência do documento fiscal some depois do lançamento', async () => {
    const r = await get(`/api/prestacoes/${prestacaoId}/conferencia`);
    const titulos = (r.body.pendencias as Array<{ titulo: string }>).map((p) => p.titulo).join(' | ');

    // A prova de que a conferência lê a prestação de verdade, e não uma foto:
    // os três blocos preenchidos saíram da lista, e o que falta continua nela.
    expect(titulos).not.toMatch(/nenhum documento fiscal/i);
    expect(titulos).not.toMatch(/nenhuma receita/i);
    expect(titulos).not.toMatch(/nenhuma disponibilidade/i);
    expect(titulos).toMatch(/nenhum pagamento/i);
  });

  /*
   * A concentração de fornecedores, com a conta conferida.
   *
   * A aritmética é o que o relatório vende: se o percentual ou o acumulado
   * saírem errados, a tela continua bonita e a frase "três credores somam 80%"
   * passa a ser mentira — sem nada quebrar. Por isso os valores são escolhidos
   * para dar números redondos: 45,44 + 4,56 = 50,00, ou seja 90,88% e 9,12%.
   */
  it('soma a despesa por credor e calcula a concentração', async () => {
    const maior = await criado('/api/despesas', {
      numero: '000999',
      credorTipoDoc: 'CNPJ',
      credorNumeroDoc: '44555666000181',
      credorNome: 'CONSTRUTORA HORIZONTE LTDA',
      descricao: 'Reforma da sede',
      dataEmissao: '2025-05-20',
      valorBruto: 45.44,
      categoriaDespesaTipo: NOTA.categoriaDespesaTipo,
    });
    const ap = await post(
      `/api/prestacoes/${prestacaoId}/documentos-fiscais/${maior.id}/apropriar`,
      {},
    );
    expect(ap.status, `apropriar: ${JSON.stringify(ap.body)}`).toBeLessThan(300);

    const r = await get(`/api/relatorios/fornecedores?ajusteId=${ajusteId}`);
    expect(r.status, JSON.stringify(r.body)).toBe(200);

    const { linhas, total, credores, maiorFatia, credoresPara80 } = r.body;
    expect(credores).toBe(2);
    expect(total).toBeCloseTo(50, 2);

    // Maior primeiro — é o que a concentração significa.
    expect(linhas[0].credorNumeroDoc).toBe('44555666000181');
    expect(linhas[0].valor).toBeCloseTo(45.44, 2);
    expect(linhas[0].percentual).toBeCloseTo(90.88, 2);
    expect(linhas[1].credorNumeroDoc).toBe(NOTA.credorNumeroDoc);
    expect(linhas[1].percentual).toBeCloseTo(9.12, 2);

    // O acumulado é o que transforma o ranking em análise: a última linha
    // fecha em 100% por construção, e é onde um erro de soma aparece.
    expect(linhas[0].acumulado).toBeCloseTo(90.88, 2);
    expect(linhas[1].acumulado).toBeCloseTo(100, 2);

    expect(maiorFatia).toBeCloseTo(90.88, 2);
    // Um credor sozinho já passa de 80%.
    expect(credoresPara80).toBe(1);
  });

  it('recusa a prestação repetida do mesmo ajuste e exercício', async () => {
    // A prestação é anual e consolidada. Uma segunda do mesmo ano não é um
    // detalhe de unicidade: seriam dois documentos disputando o mesmo
    // descritor, e o Tribunal trataria o segundo como substituição.
    const r = await post('/api/prestacoes', { ajusteId, ano: ANO });
    expect(r.status, JSON.stringify(r.body)).toBeGreaterThanOrEqual(400);
    expect(r.status).toBeLessThan(500);
  });
});
