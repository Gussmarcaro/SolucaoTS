/**
 * ANEXO RP-05/07/09/11 — Termo de Ciência e de Notificação.
 *
 * ## O que é, e por que erra tanto
 *
 * É o documento pelo qual todos os responsáveis — dos dois lados — declaram
 * saber que o ajuste e as prestações de contas serão julgados pelo TCESP, e se
 * dão por notificados para acompanhar o processo e se defender. Sem ele o
 * Tribunal não tem a quem notificar, e a falta é das que fazem o processo voltar.
 *
 * O erro clássico não é de conteúdo: é de **assinatura**. O modelo pede a
 * autoridade máxima do órgão, o ordenador de despesa, a autoridade máxima da
 * entidade e quem mais tenha concorrido para o ato — e volta do Tribunal
 * assinado só pelo prefeito, ou só pelo presidente da entidade. É exatamente a
 * informação que o nosso cadastro tem e o .docx em branco não sabe pedir.
 *
 * ## Um texto, cinco vocabulários
 *
 * São cinco anexos distintos no site do TCESP (RP-05, 07, 09, 11 e 13), e a
 * comparação dos arquivos oficiais mostra que o corpo é **idêntico** nos
 * quatro que nos interessam: muda o nome das partes — convenente/conveniada,
 * contratante/contratada, parceiro/parceira — e nada mais, com a única exceção
 * de um trecho da quarta cláusula.
 *
 * Daí o desenho: um texto, um vocabulário por tipo de ajuste. Transcrever
 * quatro cópias quase iguais garantiria que uma delas ficasse desatualizada na
 * primeira revisão do Tribunal.
 *
 * O RP-13 (auxílios, subvenções e contribuições) fica de fora de propósito: o
 * próprio modelo diz que serve "apenas para os repasses anteriores à edição da
 * LF 13019/2014", e o nosso `TipoAjuste` não tem essa modalidade.
 *
 * ## O que o texto garante
 *
 * As cláusulas estão transcritas dos arquivos oficiais sem uma palavra de
 * diferença, e `verificar:documentos` é o que mantém isso verdadeiro: ele
 * confere os trechos que identificam cada cláusula e o vocabulário de cada
 * tipo. Melhorar a redação aqui quebra o script — e é essa a intenção, porque
 * quem assina está assinando o texto do Tribunal, não o nosso.
 *
 * Função pura: recebe os dados, devolve a folha.
 */
import {
  cpfFormatado,
  reais,
  type Folha,
  type GrupoAssinaturas,
  type PessoaFolha,
} from './folha';

/** Os tipos de ajuste que o TCESP cobre com um Termo de Ciência próprio. */
export type TipoAjusteTcn =
  | 'CONTRATO_GESTAO'
  | 'CONVENIO'
  | 'TERMO_COLABORACAO'
  | 'TERMO_FOMENTO'
  | 'TERMO_PARCERIA';

/**
 * As palavras que mudam de um anexo para o outro.
 *
 * Tudo que está aqui foi lido dos .docx oficiais, incluindo as inconsistências
 * do próprio Tribunal: o RP-05 escreve "Pelo ÓRGÃO PÚBLICO CONTRATANTE" em
 * caixa mista e o RP-11 escreve "PELO ÓRGÃO PÚBLICO CONVENENTE" em maiúsculas.
 * Uniformizar pareceria mais limpo e afastaria o documento do modelo — que é o
 * único critério que importa quando o Tribunal confere.
 */
export interface VocabularioTcn {
  /** "RP-11" */
  anexo: string;
  /** "(REPASSES AO TERCEIRO SETOR - TERMO DE CONVÊNIO)" */
  subtitulo: string;
  /** Rótulo da primeira linha do cabeçalho. */
  rotuloOrgao: string;
  /** Rótulo da segunda. */
  rotuloEntidade: string;
  /** Rótulo da terceira: "TERMO DE CONVÊNIO N° (DE ORIGEM)". */
  rotuloAjuste: string;
  /** O trecho que varia na quarta cláusula de ESTAMOS CIENTES. */
  responsaveisDe: string;
  /** "AUTORIDADE MÁXIMA DO ÓRGÃO PÚBLICO CONVENENTE" */
  autoridadeOrgao: string;
  /** "ORDENADOR DE DESPESA DO ÓRGÃO PÚBLICO CONVENENTE" */
  ordenadorOrgao: string;
  /** "AUTORIDADE MÁXIMA DA ENTIDADE CONVENIADA" */
  autoridadeEntidade: string;
  /** "PELO ÓRGÃO PÚBLICO CONVENENTE:" */
  assinanteOrgao: string;
  /** "PELA ENTIDADE CONVENIADA:" */
  assinanteEntidade: string;
}

export const VOCABULARIO: Record<TipoAjusteTcn, VocabularioTcn> = {
  CONTRATO_GESTAO: {
    anexo: 'RP-05',
    subtitulo: '(REPASSES AO TERCEIRO SETOR - CONTRATOS DE GESTÃO)',
    rotuloOrgao: 'CONTRATANTE',
    rotuloEntidade: 'CONTRATADA',
    rotuloAjuste: 'CONTRATO DE GESTÃO N° (DE ORIGEM)',
    responsaveisDe: 'pela contratante e contratada',
    autoridadeOrgao: 'AUTORIDADE MÁXIMA DO ÓRGÃO PÚBLICO CONTRATANTE',
    ordenadorOrgao: 'ORDENADOR DE DESPESA DO ÓRGÃO PÚBLICO CONTRATANTE',
    autoridadeEntidade: 'AUTORIDADE MÁXIMA DA ENTIDADE BENEFICIÁRIA',
    assinanteOrgao: 'Pelo ÓRGÃO PÚBLICO CONTRATANTE:',
    assinanteEntidade: 'Pela ORGANIZAÇÃO SOCIAL:',
  },
  CONVENIO: {
    anexo: 'RP-11',
    subtitulo: '(REPASSES AO TERCEIRO SETOR - TERMO DE CONVÊNIO)',
    rotuloOrgao: 'ÓRGÃO PÚBLICO CONVENENTE',
    rotuloEntidade: 'ENTIDADE CONVENIADA',
    rotuloAjuste: 'TERMO DE CONVÊNIO N° (DE ORIGEM)',
    responsaveisDe: 'pelo órgão público convenente e entidade conveniada',
    autoridadeOrgao: 'AUTORIDADE MÁXIMA DO ÓRGÃO PÚBLICO CONVENENTE',
    ordenadorOrgao: 'ORDENADOR DE DESPESA DO ÓRGÃO PÚBLICO CONVENENTE',
    autoridadeEntidade: 'AUTORIDADE MÁXIMA DA ENTIDADE CONVENIADA',
    assinanteOrgao: 'PELO ÓRGÃO PÚBLICO CONVENENTE:',
    assinanteEntidade: 'PELA ENTIDADE CONVENIADA:',
  },
  TERMO_PARCERIA: {
    anexo: 'RP-07',
    subtitulo: '(REPASSES AO TERCEIRO SETOR - TERMOS DE PARCERIA)',
    rotuloOrgao: 'ÓRGÃO PÚBLICO PARCEIRO',
    rotuloEntidade: 'ENTIDADE PARCEIRA',
    rotuloAjuste: 'TERMO DE PARCERIA N° (DE ORIGEM)',
    responsaveisDe: 'pelo órgão concessor e entidade beneficiária',
    autoridadeOrgao: 'AUTORIDADE MÁXIMA DO ÓRGÃO PÚBLICO PARCEIRO',
    ordenadorOrgao: 'ORDENADOR DE DESPESA DO ÓRGÃO PÚBLICO PARCEIRO',
    autoridadeEntidade: 'AUTORIDADE MÁXIMA DA ENTIDADE BENEFICIÁRIA',
    assinanteOrgao: 'Pelo ÓRGÃO PÚBLICO PARCEIRO:',
    assinanteEntidade: 'Pela ENTIDADE PARCEIRA:',
  },
  /*
   * Colaboração e Fomento partilham o RP-09 — é um anexo só, intitulado "TERMO
   * DE COLABORAÇÃO/FOMENTO". Daí as duas entradas idênticas: o `Record` exige
   * uma por tipo, e é melhor repetir do que resolver por `??` e esconder que
   * são de fato o mesmo documento.
   */
  TERMO_COLABORACAO: rp09(),
  TERMO_FOMENTO: rp09(),
};

function rp09(): VocabularioTcn {
  return {
    anexo: 'RP-09',
    subtitulo: '(REPASSES AO TERCEIRO SETOR - TERMO DE COLABORAÇÃO/FOMENTO)',
    rotuloOrgao: 'ÓRGÃO/ENTIDADE PÚBLICO(A)',
    rotuloEntidade: 'ORGANIZAÇÃO DA SOCIEDADE CIVIL PARCEIRA',
    rotuloAjuste: 'TERMO DE COLABORAÇÃO/FOMENTO N° (DE ORIGEM)',
    responsaveisDe: 'pelo órgão concessor e entidade beneficiária',
    autoridadeOrgao: 'AUTORIDADE MÁXIMA DO ÓRGÃO PÚBLICO PARCEIRO',
    ordenadorOrgao: 'ORDENADOR DE DESPESA DO ÓRGÃO PÚBLICO PARCEIRO',
    autoridadeEntidade: 'AUTORIDADE MÁXIMA DA ENTIDADE BENEFICIÁRIA',
    assinanteOrgao: 'PELO ÓRGÃO PÚBLICO PARCEIRO:',
    assinanteEntidade: 'PELA ENTIDADE PARCEIRA:',
  };
}

export interface DadosTermoCiencia {
  tipoAjuste: TipoAjusteTcn;
  orgaoNome: string;
  /** Município do órgão, para o local da assinatura. */
  municipio: string | null;
  entidadeNome: string;
  /** Número de origem do ajuste; o código do TCESP serve de reserva. */
  numeroAjuste: string;
  objeto: string;
  /**
   * Valor do ajuste **atualizado** pelos termos aditivos.
   *
   * Atualizado, e não o global cru: o aditivo que acresceu valor é justamente a
   * hipótese em que o número do instrumento original deixa de ser o devido.
   */
  valorAjuste: number | null;
  /**
   * Quando o termo acompanha uma prestação de contas, o modelo pede o valor
   * **repassado** e o exercício, não o valor do ajuste — é o que diz a nota (1).
   * Nulos no termo da formalização.
   */
  valorRepassado: number | null;
  exercicio: number | null;

  autoridadeOrgao: PessoaFolha;
  ordenadorOrgao: PessoaFolha;
  autoridadeEntidade: PessoaFolha;
  /** Quem assinou o ajuste pelo órgão (o gestor da parceria, se cadastrado). */
  responsavelAjuste: PessoaFolha;
}

/** Pessoa vazia — o molde imprime linha em branco. */
export const SEM_PESSOA: PessoaFolha = { nome: null, cargo: null, cpf: null, origem: null };

export function montarTermoCiencia(d: DadosTermoCiencia): Folha {
  const v = VOCABULARIO[d.tipoAjuste];
  const prestacao = d.exercicio !== null;

  const faltando: string[] = [];
  const exigir = (p: PessoaFolha, quem: string, onde: string) => {
    if (!p.nome) faltando.push(`${quem} — ${onde}`);
    else if (!p.cpf) faltando.push(`CPF ${quem.replace(/^./, (c) => c.toLowerCase())} — ${onde}`);
    else if (!p.cargo) faltando.push(`Cargo ${quem.replace(/^./, (c) => c.toLowerCase())} — ${onde}`);
  };
  const noOrgao = 'Configurações → Órgãos Concessores';
  exigir(d.autoridadeOrgao, 'Autoridade máxima do órgão', noOrgao);
  exigir(d.ordenadorOrgao, 'Ordenador de despesa do órgão', noOrgao);
  exigir(
    d.autoridadeEntidade,
    'Autoridade máxima da entidade',
    'Cadastros → Entidades → aba Diretoria (membro com cargo de presidente e sem data de saída)',
  );

  const grupo = (
    titulo: string,
    pessoa: PessoaFolha,
    extra: Partial<GrupoAssinaturas> = {},
  ): GrupoAssinaturas => ({ titulo, pessoas: [pessoa], linhasEmBranco: 0, ...extra });

  return {
    anexo: v.anexo,
    titulo: `ANEXO ${v.anexo} - TERMO DE CIÊNCIA E DE NOTIFICAÇÃO`,
    subtitulo: v.subtitulo,
    observacao: null,
    cabecalho: [
      { rotulo: v.rotuloOrgao, valor: d.orgaoNome },
      { rotulo: v.rotuloEntidade, valor: d.entidadeNome },
      { rotulo: v.rotuloAjuste, valor: d.numeroAjuste },
      { rotulo: 'OBJETO', valor: d.objeto },
      {
        rotulo: 'VALOR DO AJUSTE/VALOR REPASSADO',
        nota: '(1)',
        valor: reais(prestacao ? d.valorRepassado : d.valorAjuste),
      },
      { rotulo: 'EXERCÍCIO', nota: '(1)', valor: d.exercicio ? String(d.exercicio) : null },
      // Facultativo pelo próprio modelo, e o sistema não cadastra advogado:
      // sai sempre em branco, de propósito.
      { rotulo: 'ADVOGADO(S) / Nº OAB / E-MAIL', nota: '(2)', valor: null },
    ],
    secoes: [
      { titulo: null, itens: ['Pelo presente TERMO, nós, abaixo identificados:'] },
      {
        titulo: 'Estamos CIENTES de que:',
        numerada: true,
        itens: [
          'o ajuste acima referido e seus aditamentos, bem como os processos das respectivas prestações de contas, estarão sujeitos a análise e julgamento pelo Tribunal de Contas do Estado de São Paulo, cujo trâmite processual ocorrerá pelo sistema eletrônico;',
          'poderemos ter acesso ao processo, tendo vista e extraindo cópias das manifestações de interesse, Despachos e Decisões, mediante regular cadastramento no Sistema de Processo Eletrônico, em consonância com o estabelecido na Resolução nº 01/2011 do TCESP;',
          'além de disponíveis no processo eletrônico, todos os Despachos e Decisões que vierem a ser tomados, relativamente ao aludido processo, serão publicados no Diário Oficial Eletrônico do Tribunal de Contas do Estado de São Paulo (https://doe.tce.sp.gov.br/), em conformidade com o artigo 90 da Lei Complementar nº 709, de 14 de janeiro de 1993, iniciando-se, a partir de então, a contagem dos prazos processuais, conforme regras do Código de Processo Civil;',
          `as informações pessoais do(s) responsável(is) ${v.responsaveisDe}, bem como dos interessados, estão cadastradas no módulo eletrônico do “Cadastro Corporativo TCESP – CadTCESP”, nos termos previstos no Artigo 2º das Instruções nº01/2024, conforme “Declaração(ões) de Atualização Cadastral” anexa (s).`,
        ],
      },
      {
        titulo: 'Damo-nos por NOTIFICADOS para:',
        numerada: true,
        itens: [
          'O acompanhamento dos atos do processo até seu julgamento final e consequente publicação;',
          'Se for o caso e de nosso interesse, nos prazos e nas formas legais e regimentais, exercer o direito de defesa, interpor recursos e o que mais couber;',
          'Este termo corresponde à situação prevista no inciso II do artigo 30 da Lei Complementar nº 709, de 14 de janeiro de 1993, em que, se houver débito, determinando a notificação do responsável para, no prazo estabelecido no Regimento Interno, apresentar defesa ou recolher a importância devida;',
          'A notificação pessoal só ocorrerá caso a defesa apresentada seja rejeitada, mantida a determinação de recolhimento, conforme §1º do artigo 30 da citada Lei.',
        ],
      },
    ],
    localEData: d.municipio
      ? `${d.municipio}, ______ de __________________ de ______.`
      : 'LOCAL e DATA:',
    assinaturas: [
      grupo(v.autoridadeOrgao, d.autoridadeOrgao),
      grupo(v.ordenadorOrgao, d.ordenadorOrgao),
      grupo(v.autoridadeEntidade, d.autoridadeEntidade),
      {
        titulo: 'Responsáveis que assinaram o ajuste e/ou Parecer Conclusivo:',
        subtitulo: v.assinanteOrgao,
        pessoas: [d.responsavelAjuste],
        // Uma linha a mais sempre: o parecer conclusivo pode ser de outra
        // pessoa, e o próprio modelo avisa que nesse caso ela é notificada em
        // separado. Deixar onde escrever é mais honesto que supor quem é.
        linhasEmBranco: 1,
      },
      {
        titulo: 'Responsáveis que assinaram o ajuste e/ou prestação de contas:',
        subtitulo: v.assinanteEntidade,
        pessoas: [d.autoridadeEntidade],
        linhasEmBranco: 1,
      },
      {
        titulo: 'DEMAIS RESPONSÁVEIS (*):',
        pessoas: [],
        linhasEmBranco: 2,
        campoExtra: 'Tipo de ato sob sua responsabilidade',
      },
    ],
    notas: [
      '(1) Valor repassado e exercício, quando se tratar de processo de prestação de contas.',
      '(2) Facultativo. Indicar quando já constituído.',
      '(*) O Termo de Ciência e de Notificação deve identificar as pessoas físicas que tenham concorrido para a prática do ato jurídico, na condição de ordenador da despesa; de partes contratantes; de responsáveis por ações de acompanhamento, monitoramento e avaliação; de responsáveis por processos licitatórios; de responsáveis por prestações de contas; de responsáveis com atribuições previstas em atos legais ou administrativos e de interessados relacionados a processos de competência deste Tribunal. Na hipótese de prestações de contas, caso o signatário do parecer conclusivo seja distinto daqueles já arrolados como subscritores do Termo de Ciência e de Notificação, será ele objeto de notificação específica.',
    ],
    faltando,
  };
}

/** Só para quem monta os dados — mascara o CPF do jeito que a folha espera. */
export function pessoa(
  nome: string | null | undefined,
  cargo: string | null | undefined,
  cpf: string | null | undefined,
  origem: string,
): PessoaFolha {
  if (!nome && !cpf) return SEM_PESSOA;
  return {
    nome: nome ?? null,
    cargo: cargo ?? null,
    cpf: cpfFormatado(cpf),
    origem,
  };
}
