/**
 * ANEXO RP-06/08/10/12 — Demonstrativo Integral das Receitas e Despesas.
 *
 * ## O que é
 *
 * O balanço do exercício que a entidade assina e o órgão anexa à prestação de
 * contas: o que havia (saldo anterior), o que entrou (repasses, rendimentos,
 * outras receitas, recursos próprios), o que se gastou por categoria — em
 * quatro colunas que separam competência de caixa — e o que sobra para
 * devolver ou aplicar no exercício seguinte.
 *
 * ## Um texto, quatro vocabulários (como o Termo de Ciência)
 *
 * Os .docx do TCESP para Contrato de Gestão (RP-06), Termo de Parceria
 * (RP-08), Colaboração/Fomento (RP-10) e Convênio (RP-12) têm a **mesma
 * estrutura**, linha por linha; muda o nome das partes e um rótulo ou outro.
 * O RP-14 (auxílios e subvenções) é outro desenho e fica de fora: o sistema não
 * tem essa modalidade.
 *
 * ## Um anexo por esfera — e o problema que isso cria
 *
 * O modelo manda elaborar "um anexo para cada fonte de recurso" — federal,
 * estadual ou municipal. No sistema, a fonte mora no **pagamento**, na
 * **receita** e na **conta bancária**, não na nota. Daí a regra de atribuição,
 * que é o ponto mais delicado deste arquivo (`atribuir`):
 *
 * 1. Fonte conhecida → a esfera dela.
 * 2. Fonte desconhecida e o ajuste tem **uma esfera só** → ela. Não há dúvida
 *    possível sobre de onde veio o dinheiro.
 * 3. Fonte desconhecida e o ajuste tem várias → **não se atribui**. O valor
 *    fica fora dos anexos e entra em `faltando`, com o total. Dividir por
 *    palpite poria num documento assinado um número que ninguém lançou.
 *
 * A nota fiscal segue os seus pagamentos: paga por duas fontes, divide-se na
 * proporção do que cada uma pagou; ainda não paga, cai na regra 2 ou 3.
 *
 * ## As categorias
 *
 * As 16 linhas do anexo são exatamente as 16 categorias do plano padrão do
 * sistema. Quando a nota foi lançada com o Item da Proposta, a linha sai dele;
 * senão, da categoria Audesp (88 códigos), pela tabela `LINHA_DO_CODIGO` —
 * que é uma decisão nossa, e por isso está escrita aqui, à vista.
 *
 * Função pura: recebe os dados, devolve o documento. Conferida por
 * `verificar:documentos`, sem banco.
 */
import { despesasDoPeriodo, type DespesaBruta } from '@/core/relatorio/despesasPeriodo';
import { PLANO_PADRAO } from '@/core/planoAplicacao/planoPadrao';

// --- esferas -----------------------------------------------------------------

export type Esfera = 'FEDERAL' | 'ESTADUAL' | 'MUNICIPAL';
export const ESFERAS: Esfera[] = ['FEDERAL', 'ESTADUAL', 'MUNICIPAL'];

export const ROTULO_ESFERA: Record<Esfera, string> = {
  FEDERAL: 'Federal',
  ESTADUAL: 'Estadual',
  MUNICIPAL: 'Municipal',
};

/**
 * A esfera de um código de fonte do Audesp (`fonte_recurso_tipo`).
 *
 * 5/95 são transferências federais, 2/92 estaduais. O resto — tesouro,
 * fundos, administração indireta, outras fontes, operações de crédito,
 * emendas do legislativo municipal — é dinheiro do próprio município. A série
 * 9x repete a 1–8 para restos de exercícios anteriores: a esfera é a mesma.
 */
export function esferaDaFonte(fonte: number): Esfera {
  const base = fonte > 90 ? fonte - 90 : fonte;
  if (base === 5) return 'FEDERAL';
  if (base === 2) return 'ESTADUAL';
  return 'MUNICIPAL';
}

// --- categorias ---------------------------------------------------------------

/** As 16 linhas do quadro de despesas, na ordem do anexo. */
export const LINHAS_DESPESA = [
  { id: 'RH_PESSOAL', rotulo: 'Recursos humanos (5)' },
  { id: 'RH_TERCEIROS', rotulo: 'Recursos humanos (6)' },
  { id: 'MEDICAMENTOS', rotulo: 'Medicamentos' },
  { id: 'MATERIAL_MEDICO', rotulo: 'Material médico e hospitalar (*)' },
  { id: 'GENEROS', rotulo: 'Gêneros alimentícios' },
  { id: 'OUTROS_MATERIAIS', rotulo: 'Outros materiais de consumo' },
  { id: 'SERVICOS_MEDICOS', rotulo: 'Serviços médicos (*)' },
  { id: 'OUTROS_SERVICOS', rotulo: 'Outros serviços de terceiros' },
  { id: 'LOCACAO_IMOVEIS', rotulo: 'Locação de imóveis' },
  { id: 'LOCACOES_DIVERSAS', rotulo: 'Locações diversas' },
  { id: 'UTILIDADES', rotulo: 'Utilidades públicas (7)' },
  { id: 'COMBUSTIVEL', rotulo: 'Combustível' },
  { id: 'BENS_PERMANENTES', rotulo: 'Bens e materiais permanentes' },
  { id: 'OBRAS', rotulo: 'Obras' },
  { id: 'DESPESAS_FINANCEIRAS', rotulo: 'Despesas financeiras e bancárias' },
  { id: 'OUTRAS', rotulo: 'Outras despesas' },
] as const;

export type LinhaDespesaId = (typeof LINHAS_DESPESA)[number]['id'];

/**
 * Categoria do plano padrão → linha do anexo. É um para um, na mesma ordem: o
 * plano padrão foi desenhado a partir deste anexo.
 */
const LINHA_DO_PLANO: Record<string, LinhaDespesaId> = Object.fromEntries(
  PLANO_PADRAO.map((g, i) => [chave(g.categoria), LINHAS_DESPESA[ordemDoPlano(i)].id]),
);

/**
 * O plano padrão lista as categorias numa ordem um pouco diferente da do
 * anexo (serviços médicos vem logo depois de RH, combustível antes de
 * materiais). Este mapa é a ponte, posição a posição.
 */
function ordemDoPlano(i: number): number {
  // posição no PLANO_PADRAO (1..16) → posição em LINHAS_DESPESA (0..15)
  const ponte = [0, 1, 6, 2, 3, 4, 11, 5, 7, 8, 9, 10, 12, 13, 14, 15];
  return ponte[i];
}

/**
 * Categoria Audesp (`categoria_despesas_tipo`) → linha do anexo, para a nota
 * lançada sem o Item da Proposta.
 *
 * As escolhas que não são óbvias: manutenção é **serviço** de terceiros;
 * material de expediente é material de **consumo**; seguro administrativo é
 * serviço; tributos e viagens vão para "outras". O "PF/PJ" genérico (62/63)
 * fica em outros serviços, e não em RH (6): o anexo põe ali a equipe contratada
 * como autônomo ou PJ, e um serviço avulso de pessoa física não é equipe — quem
 * contrata equipe assim lança pelo plano padrão, que distingue.
 */
const LINHA_DO_CODIGO: Record<number, LinhaDespesaId> = (() => {
  const m: Record<number, LinhaDespesaId> = {};
  const faixa = (de: number, ate: number, l: LinhaDespesaId) => {
    for (let c = de; c <= ate; c++) m[c] = l;
  };
  faixa(1, 3, 'BENS_PERMANENTES');
  faixa(4, 7, 'DESPESAS_FINANCEIRAS');
  m[8] = 'OUTRAS';
  m[9] = 'COMBUSTIVEL';
  m[10] = 'OUTRAS';
  m[11] = 'OUTROS_MATERIAIS';
  m[12] = 'OUTROS_SERVICOS';
  m[13] = 'OUTRAS';
  m[14] = 'OUTRAS';
  m[15] = 'GENEROS';
  faixa(16, 23, 'LOCACOES_DIVERSAS');
  m[20] = 'LOCACAO_IMOVEIS';
  faixa(24, 28, 'OUTROS_SERVICOS');
  faixa(29, 32, 'OUTROS_MATERIAIS');
  m[33] = 'MATERIAL_MEDICO';
  m[34] = 'MEDICAMENTOS';
  faixa(35, 55, 'RH_PESSOAL');
  faixa(56, 68, 'OUTROS_SERVICOS');
  m[61] = 'OBRAS';
  m[69] = 'SERVICOS_MEDICOS';
  m[70] = 'SERVICOS_MEDICOS';
  faixa(71, 76, 'UTILIDADES');
  m[77] = 'OUTROS_SERVICOS';
  m[78] = 'OUTROS_SERVICOS';
  faixa(79, 82, 'OUTROS_MATERIAIS');
  m[83] = 'RH_PESSOAL';
  m[84] = 'RH_PESSOAL';
  m[85] = 'UTILIDADES';
  m[86] = 'OUTROS_MATERIAIS';
  faixa(87, 89, 'OUTRAS');
  return m;
})();

function chave(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** A linha do anexo de uma despesa. A folha de pagamento é sempre RH (5). */
export function linhaDaDespesa(d: {
  folha: boolean;
  propostaCategoria: string | null;
  categoriaDespesaTipo: number | null;
}): LinhaDespesaId {
  if (d.folha) return 'RH_PESSOAL';
  if (d.propostaCategoria) {
    const doPlano = LINHA_DO_PLANO[chave(d.propostaCategoria)];
    if (doPlano) return doPlano;
  }
  return (d.categoriaDespesaTipo != null && LINHA_DO_CODIGO[d.categoriaDespesaTipo]) || 'OUTRAS';
}

// --- vocabulário --------------------------------------------------------------

export type TipoAjusteDemonstrativo =
  | 'CONTRATO_GESTAO'
  | 'CONVENIO'
  | 'TERMO_COLABORACAO'
  | 'TERMO_FOMENTO'
  | 'TERMO_PARCERIA';

/** As palavras que mudam de um anexo para o outro — lidas dos .docx oficiais. */
export interface VocabularioDemonstrativo {
  anexo: string;
  modalidade: string;
  rotuloOrgao: string;
  rotuloEntidade: string;
  /** Só o RP-06 tem: "ENTIDADE GERENCIADA (*)", sempre em branco. */
  rotuloGerenciada: string | null;
  rotuloResponsavel: string;
  rotuloObjeto: string;
  instrumento: string;
  rotuloProprios: string;
  orgaoNaDeclaracao: string;
  assinantes: string;
  /** O RP-06 tem uma vírgula a mais nesta frase. Fica, pela mesma razão do resto. */
  virgulaAntesDeBemComo: boolean;
}

export const VOCABULARIO_DEMONSTRATIVO: Record<TipoAjusteDemonstrativo, VocabularioDemonstrativo> = {
  CONTRATO_GESTAO: {
    anexo: 'RP-06',
    modalidade: 'CONTRATO DE GESTÃO',
    rotuloOrgao: 'CONTRATANTE',
    rotuloEntidade: 'CONTRATADA',
    rotuloGerenciada: 'ENTIDADE GERENCIADA (*)',
    rotuloResponsavel: 'RESPONSÁVEL(IS) PELA ORGANIZAÇÃO SOCIAL',
    rotuloObjeto: 'OBJETO DO CONTRATO DE GESTÃO',
    instrumento: 'Contrato de Gestão nº',
    rotuloProprios: '(F) RECURSOS PRÓPRIOS DA ORGANIZAÇÃO SOCIAL',
    orgaoNaDeclaracao: 'Órgão Público Contratante',
    assinantes: 'Responsáveis pela Contratada',
    virgulaAntesDeBemComo: true,
  },
  CONVENIO: {
    anexo: 'RP-12',
    modalidade: 'TERMO DE CONVÊNIO',
    rotuloOrgao: 'ÓRGÃO PÚBLICO CONVENENTE',
    rotuloEntidade: 'CONVENIADA',
    rotuloGerenciada: null,
    rotuloResponsavel: 'RESPONSÁVEL(IS) PELA CONVENIADA',
    rotuloObjeto: 'OBJETO',
    instrumento: 'Termo de Convênio nº',
    rotuloProprios: '(F) RECURSOS PRÓPRIOS DA ENTIDADE BENEFICIÁRIA',
    orgaoNaDeclaracao: 'Órgão Público Convenente',
    assinantes: 'Responsáveis pela Conveniada',
    virgulaAntesDeBemComo: false,
  },
  TERMO_PARCERIA: {
    anexo: 'RP-08',
    modalidade: 'TERMO DE PARCERIA',
    rotuloOrgao: 'ÓRGÃO PÚBLICO PARCEIRO',
    rotuloEntidade: 'ORGANIZAÇÃO SOCIAL DE INTERESSE PÚBLICO',
    rotuloGerenciada: null,
    rotuloResponsavel: 'RESPONSÁVEL(IS) PELA OSCIP',
    rotuloObjeto: 'OBJETO DA PARCERIA',
    instrumento: 'Termo de Parceria nº',
    rotuloProprios: '(F) RECURSOS PRÓPRIOS DA OSCIP',
    orgaoNaDeclaracao: 'Órgão Público Parceiro',
    assinantes: 'Responsáveis pela Organização Social de Interesse Público',
    virgulaAntesDeBemComo: false,
  },
  TERMO_COLABORACAO: rp10(),
  TERMO_FOMENTO: rp10(),
};

function rp10(): VocabularioDemonstrativo {
  return {
    anexo: 'RP-10',
    modalidade: 'TERMO DE COLABORAÇÃO/FOMENTO',
    rotuloOrgao: 'ÓRGÃO PÚBLICO',
    rotuloEntidade: 'ORGANIZAÇÃO DA SOCIEDADE CIVIL',
    rotuloGerenciada: null,
    rotuloResponsavel: 'RESPONSÁVEL(IS) PELA OSC',
    rotuloObjeto: 'OBJETO DA PARCERIA',
    instrumento: 'Termo de Colaboração/Fomento nº',
    rotuloProprios: '(F) RECURSOS PRÓPRIOS DA ENTIDADE PARCEIRA',
    orgaoNaDeclaracao: 'Órgão Público Parceiro',
    assinantes: 'Responsáveis pela Organização da Sociedade Civil',
    virgulaAntesDeBemComo: false,
  };
}

// --- entrada ----------------------------------------------------------------

export interface PessoaDemonstrativo {
  nome: string | null;
  cargo: string | null;
  cpf: string | null;
}

export interface DadosDemonstrativo {
  tipoAjuste: TipoAjusteDemonstrativo;
  exercicio: number;
  orgaoNome: string;
  municipio: string | null;
  entidade: { nome: string; cnpj: string | null; endereco: string | null };
  responsavel: PessoaDemonstrativo;
  objeto: string;
  /** O instrumento e os aditamentos — o quadro "DOCUMENTO / DATA / VIGÊNCIA / VALOR". */
  instrumentos: { documento: string; data: string | null; vigencia: string | null; valor: number | null }[];
  /** Esferas declaradas pelo ajuste (pelas fontes de recurso dele). */
  esferasDoAjuste: Esfera[];
  /** As parcelas do bloco Repasses da prestação. */
  repasses: {
    dataPrevista: string | null;
    valorPrevisto: number | null;
    dataRepasse: string | null;
    numeroDocumento: string | null;
    valorRepasse: number;
    fonte: number | null;
  }[];
  /** Receitas do exercício que não são repasse. */
  receitas: { tipo: string; fonte: number | null; valor: number }[];
  /**
   * O saldo que vem do exercício anterior, por esfera, já resolvido por quem
   * monta os dados (prestação anterior, ou o valor informado na tela).
   */
  saldoAnterior: { porEsfera: Partial<Record<Esfera, number>>; semEsfera: number; origem: string | null };
  /** Notas que o exercício alcança (emitidas ou pagas nele), com a fonte de cada pagamento. */
  notas: {
    id: string;
    dataEmissao: string;
    valorContabil: number;
    linha: LinhaDespesaId;
    pagamentos: { data: string; valor: number; fonte: number | null }[];
  }[];
  /** Devoluções ao órgão no exercício. */
  devolucoes: { valor: number }[];
}

// --- saída ------------------------------------------------------------------

export interface LinhaRecursos {
  dataPrevista: string | null;
  valorPrevisto: number | null;
  dataRepasse: string | null;
  numeroDocumento: string | null;
  valorRepasse: number;
}

export interface ColunasDespesa {
  /** Despesas contabilizadas neste exercício. */
  contabilizadas: number;
  /** (H) contabilizadas em exercícios anteriores e pagas neste. */
  anterioresPagas: number;
  /** (I) contabilizadas neste exercício e pagas neste. */
  contabilizadasPagas: number;
  /** (J = H + I) total pago neste exercício. */
  totalPago: number;
  /** Contabilizadas neste exercício, a pagar nos seguintes. */
  aPagar: number;
}

export interface AnexoEsfera {
  esfera: Esfera;
  repasses: LinhaRecursos[];
  A: number;
  B: number;
  C: number;
  D: number;
  E: number;
  F: number;
  G: number;
  despesas: ({ id: LinhaDespesaId; rotulo: string } & ColunasDespesa)[];
  totalDespesas: ColunasDespesa;
  J: number;
  K: number;
  L: number;
  M: number;
}

export interface DemonstrativoIntegral {
  anexo: string;
  vocabulario: VocabularioDemonstrativo;
  exercicio: number;
  orgaoNome: string;
  entidade: DadosDemonstrativo['entidade'];
  responsavel: PessoaDemonstrativo;
  objeto: string;
  instrumentos: DadosDemonstrativo['instrumentos'];
  localEData: string;
  textos: {
    signatario: string;
    declaracao: string;
    notasRecursos: string[];
    notasDespesas: string[];
  };
  anexos: AnexoEsfera[];
  /** O que não entrou em anexo nenhum, ou não pôde ser preenchido. */
  faltando: string[];
}

// --- cálculo ------------------------------------------------------------------

const cent = (n: number) => Math.round(n * 100) / 100;
const reaisTexto = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** A esfera de um valor, pela regra do cabeçalho. Null = não atribuível. */
function atribuidor(esferasDoAjuste: Esfera[]) {
  const unica = esferasDoAjuste.length === 1 ? esferasDoAjuste[0] : null;
  return (fonte: number | null): Esfera | null => (fonte != null ? esferaDaFonte(fonte) : unica);
}

/** A esfera de uma receita de aplicação financeira, pelo próprio tipo. */
function esferaDoTipo(tipo: string): Esfera | null {
  if (tipo.endsWith('_FEDERAL')) return 'FEDERAL';
  if (tipo.endsWith('_ESTADUAL')) return 'ESTADUAL';
  if (tipo.endsWith('_MUNICIPAL')) return 'MUNICIPAL';
  return null;
}

export function montarDemonstrativoIntegral(d: DadosDemonstrativo): DemonstrativoIntegral {
  const v = VOCABULARIO_DEMONSTRATIVO[d.tipoAjuste];
  const atribuir = atribuidor(d.esferasDoAjuste);
  const periodo = { de: `${d.exercicio}-01-01`, ate: `${d.exercicio}-12-31` };
  const naoAtribuido: { oque: string; valor: number }[] = [];
  const naoAtribuir = (oque: string, valor: number) => {
    if (Math.abs(valor) >= 0.005) naoAtribuido.push({ oque, valor: cent(valor) });
  };

  // ---- receitas e repasses, por esfera
  const vazio = () => ({ repasses: [] as LinhaRecursos[], B: 0, C: 0, D: 0, F: 0, L: 0 });
  const acc: Record<Esfera, ReturnType<typeof vazio>> = {
    FEDERAL: vazio(),
    ESTADUAL: vazio(),
    MUNICIPAL: vazio(),
  };

  for (const r of d.repasses) {
    const e = atribuir(r.fonte);
    if (!e) {
      naoAtribuir('repasse sem fonte de recurso', r.valorRepasse);
      continue;
    }
    acc[e].repasses.push({
      dataPrevista: r.dataPrevista,
      valorPrevisto: r.valorPrevisto,
      dataRepasse: r.dataRepasse,
      numeroDocumento: r.numeroDocumento,
      valorRepasse: r.valorRepasse,
    });
    // (B) é o que entrou **neste** exercício. A parcela prevista em dezembro e
    // paga em janeiro aparece na lista (nota 2 do modelo), mas soma no ano em
    // que o dinheiro chegou.
    if (r.dataRepasse && r.dataRepasse >= periodo.de && r.dataRepasse <= periodo.ate)
      acc[e].B = cent(acc[e].B + r.valorRepasse);
  }

  for (const r of d.receitas) {
    if (r.tipo === 'REPASSE_RECEBIDO') continue; // vem do bloco Repasses
    const aplicacao = r.tipo.startsWith('APLIC_FINANC');
    const e = (aplicacao ? esferaDoTipo(r.tipo) : null) ?? atribuir(r.fonte);
    const campo = aplicacao ? 'C' : r.tipo === 'RECURSO_PROPRIO' ? 'F' : 'D';
    if (!e) {
      naoAtribuir(
        campo === 'C' ? 'rendimento de aplicação sem esfera' : campo === 'F' ? 'recurso próprio sem fonte' : 'outra receita sem fonte',
        r.valor,
      );
      continue;
    }
    acc[e][campo] = cent(acc[e][campo] + r.valor);
  }

  for (const x of d.devolucoes) {
    const e = atribuir(null);
    if (!e) naoAtribuir('devolução ao órgão (sem fonte no lançamento)', x.valor);
    else acc[e].L = cent(acc[e].L + x.valor);
  }
  if (d.saldoAnterior.semEsfera) naoAtribuir('saldo do exercício anterior em conta sem fonte', d.saldoAnterior.semEsfera);

  // ---- despesas: cada nota é repartida entre as esferas que a pagaram
  const notasPorEsfera: Record<Esfera, (DespesaBruta & { linha: LinhaDespesaId })[]> = {
    FEDERAL: [],
    ESTADUAL: [],
    MUNICIPAL: [],
  };
  for (const n of d.notas) {
    const pagoPor = new Map<Esfera | null, number>();
    for (const p of n.pagamentos) {
      const e = atribuir(p.fonte);
      pagoPor.set(e, (pagoPor.get(e) ?? 0) + p.valor);
    }
    const totalPago = [...pagoPor.values()].reduce((s, x) => s + x, 0);
    // Peso de cada esfera: o que ela pagou. Sem pagamento, a esfera única do
    // ajuste leva tudo — ou ninguém, e a nota vai para `faltando`.
    const pesos: [Esfera | null, number][] =
      totalPago > 0 ? [...pagoPor.entries()].map(([e, x]) => [e, x / totalPago]) : [[atribuir(null), 1]];

    for (const [e, peso] of pesos) {
      const pagamentos = n.pagamentos
        .filter((p) => atribuir(p.fonte) === e)
        .map((p) => ({ data: p.data, valor: p.valor, codigoExtrato: null }));
      if (!e) {
        const emitidaNoAno = n.dataEmissao >= periodo.de && n.dataEmissao <= periodo.ate;
        naoAtribuir(
          'despesa sem fonte de recurso',
          emitidaNoAno ? n.valorContabil * peso : pagamentos.filter((p) => p.data >= periodo.de && p.data <= periodo.ate).reduce((s, p) => s + p.valor, 0),
        );
        continue;
      }
      notasPorEsfera[e].push({
        id: `${n.id}:${e}`,
        dataEmissao: n.dataEmissao,
        valorContabil: cent(n.valorContabil * peso),
        pagamentos,
        linha: n.linha,
      });
    }
  }

  // ---- quais esferas viram anexo
  const comMovimento = ESFERAS.filter(
    (e) =>
      d.esferasDoAjuste.includes(e) ||
      acc[e].repasses.length ||
      acc[e].C || acc[e].D || acc[e].F || acc[e].L ||
      notasPorEsfera[e].length ||
      d.saldoAnterior.porEsfera[e],
  );
  const esferas: Esfera[] = comMovimento.length ? comMovimento : ['MUNICIPAL'];

  const anexos: AnexoEsfera[] = esferas.map((e) => {
    const a = acc[e];
    const A = cent(d.saldoAnterior.porEsfera[e] ?? 0);
    const E = cent(A + a.B + a.C + a.D);
    const G = cent(E + a.F);

    const despesas = LINHAS_DESPESA.map((l) => {
      const t = despesasDoPeriodo(
        notasPorEsfera[e].filter((n) => n.linha === l.id),
        periodo,
      ).totais;
      return {
        id: l.id,
        rotulo: l.rotulo,
        contabilizadas: t.contabilizado,
        anterioresPagas: t.anterioresPagasNoPeriodo,
        contabilizadasPagas: t.contabilizadoEPagoNoPeriodo,
        totalPago: t.pagoNoPeriodo,
        aPagar: t.aPagar,
      };
    });
    const somar = (k: keyof ColunasDespesa) => cent(despesas.reduce((s, x) => s + x[k], 0));
    const totalDespesas: ColunasDespesa = {
      contabilizadas: somar('contabilizadas'),
      anterioresPagas: somar('anterioresPagas'),
      contabilizadasPagas: somar('contabilizadasPagas'),
      totalPago: somar('totalPago'),
      aPagar: somar('aPagar'),
    };
    const J = totalDespesas.totalPago;
    // (K) = E − (J − F): o recurso próprio paga primeiro o que ele cobre, e o
    // que sobra de despesa é que consome o recurso público.
    const K = cent(E - (J - a.F));
    const M = cent(K - a.L);

    return {
      esfera: e,
      repasses: [...a.repasses].sort((x, y) =>
        (x.dataPrevista ?? x.dataRepasse ?? '').localeCompare(y.dataPrevista ?? y.dataRepasse ?? ''),
      ),
      A,
      B: a.B,
      C: a.C,
      D: a.D,
      E,
      F: a.F,
      G,
      despesas,
      totalDespesas,
      J,
      K,
      L: a.L,
      M,
    };
  });

  // ---- o que falta
  const faltando: string[] = [];
  if (!d.responsavel.nome || !d.responsavel.cpf)
    faltando.push(
      'Responsável pela entidade (nome e CPF) — Cadastros → Entidades → aba Diretoria (membro com cargo de presidente e sem data de saída).',
    );
  if (!d.esferasDoAjuste.length)
    faltando.push('O ajuste não tem fonte de recurso cadastrada — é ela que diz qual anexo (federal, estadual, municipal) cada valor ocupa.');
  if (d.saldoAnterior.origem) faltando.push(d.saldoAnterior.origem);
  if (naoAtribuido.length) {
    const agrupado = new Map<string, number>();
    for (const x of naoAtribuido) agrupado.set(x.oque, cent((agrupado.get(x.oque) ?? 0) + x.valor));
    faltando.push(
      'Valores fora dos anexos, porque o ajuste tem mais de uma esfera e o lançamento não diz de qual veio: ' +
        [...agrupado.entries()].map(([oque, valor]) => `${oque} (${reaisTexto(valor)})`).join('; ') +
        '. Informe a fonte de recurso no lançamento para entrarem no anexo certo.',
    );
  }

  return {
    anexo: v.anexo,
    vocabulario: v,
    exercicio: d.exercicio,
    orgaoNome: d.orgaoNome,
    entidade: d.entidade,
    responsavel: d.responsavel,
    objeto: d.objeto,
    instrumentos: d.instrumentos,
    localEData: d.municipio ? `${d.municipio}, ______ de __________________ de ______.` : 'Local e data:',
    textos: {
      signatario:
        `O(s) signatário(s), na qualidade de representante(s) da ${d.entidade.nome} vem indicar, na forma abaixo detalhada, ` +
        `as despesas incorridas e pagas no exercício/${d.exercicio}${v.virgulaAntesDeBemComo ? ',' : ''} bem como as despesas a pagar no exercício seguinte.`,
      declaracao:
        'Declaro(amos), na qualidade de responsável(is) pela entidade supra epigrafada, sob as penas da Lei, que a despesa ' +
        `relacionada comprova a exata aplicação dos recursos recebidos para os fins indicados, conforme programa de trabalho aprovado, proposto ao ${v.orgaoNaDeclaracao}.`,
      notasRecursos: [
        '(1) Verba: Federal, Estadual ou Municipal, devendo ser elaborado um anexo para cada fonte de recurso.',
        '(2) Incluir valores previstos no exercício anterior e repassados neste exercício.',
        '(3) Receitas com estacionamento, aluguéis, entre outras.',
      ],
      notasDespesas: [
        '(4) Verba: Federal, Estadual, Municipal e Recursos Próprios, devendo ser elaborado um anexo para cada fonte de recurso.',
        '(5) Salários, encargos e benefícios.',
        '(6) Autônomos e pessoa jurídica.',
        '(7) Energia elétrica, água e esgoto, gás, telefone e internet.',
        '(8) No rol exemplificativo incluir também as aquisições e os compromissos assumidos que não são classificados contabilmente como DESPESAS, como, por exemplo, aquisição de bens permanentes.',
        '(9) Quando a diferença entre a Coluna DESPESAS CONTABILIZADAS NESTE EXERCÍCIO e a Coluna DESPESAS CONTABILIZADAS NESTE EXERCÍCIO E PAGAS NESTE EXERCÍCIO for decorrente de descontos obtidos ou pagamento de multa por atraso, o resultado não deve aparecer na coluna DESPESAS CONTABILIZADAS NESTE EXERCÍCIO A PAGAR EM EXERCÍCIOS SEGUINTES, uma vez que tais descontos ou multas são contabilizados em contas de receitas ou despesas. Assim sendo deverá ser indicado como nota de rodapé os valores e as respectivas contas de receitas e despesas.',
        '(*) Apenas para entidades da área da Saúde.',
      ],
    },
    anexos,
    faltando,
  };
}
