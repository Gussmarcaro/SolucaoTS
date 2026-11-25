/**
 * ANEXO RP-04 — Relação dos Valores Transferidos.
 *
 * ## O que é
 *
 * A lista, assinada pelo órgão, de **todo** ajuste com o Terceiro Setor no
 * exercício: modalidade, número, beneficiário, vigência, valor global, fonte e
 * quanto foi repassado no ano. É a peça que o Tribunal usa para cruzar o que o
 * órgão diz ter transferido com o que cada entidade diz ter recebido — por isso
 * o valor repassado sai do mesmo bloco Repasses que vai em cada prestação.
 *
 * Diferente dos outros anexos, não é de uma prestação nem de um ajuste: é do
 * **órgão** e do **exercício**.
 *
 * ## O que entra
 *
 * Todo ajuste que teve repasse no exercício **ou** cuja vigência alcança o ano.
 * O segundo critério importa: ajuste vigente sem repasse no ano é informação
 * (atraso, suspensão, parceria sem desembolso), e omiti-lo deixaria a relação
 * mais limpa e menos verdadeira.
 *
 * O quadro de **auxílios, subvenções e contribuições** sai vazio: o sistema não
 * tem essa modalidade (é anterior à Lei 13.019). Ele continua no papel porque
 * o modelo o tem, e quem tiver o que declarar ali preenche à mão.
 *
 * Função pura. Conferida por `verificar:documentos`, sem banco.
 */
import { ROTULO_ESFERA, type Esfera } from './demonstrativoIntegral';
import type { PessoaFolha } from './folha';

export type TipoAjusteRelacao =
  | 'CONTRATO_GESTAO'
  | 'TERMO_PARCERIA'
  | 'TERMO_COLABORACAO'
  | 'TERMO_FOMENTO'
  | 'CONVENIO';

/** Os cinco quadros, na ordem do modelo, com o rótulo da primeira coluna. */
export const GRUPOS_RELACAO: { tipo: TipoAjusteRelacao; rotulo: string }[] = [
  { tipo: 'CONTRATO_GESTAO', rotulo: 'CONTRATO DE GESTÃO N°' },
  { tipo: 'TERMO_PARCERIA', rotulo: 'TERMO DE PARCERIA N°' },
  { tipo: 'TERMO_COLABORACAO', rotulo: 'TERMO DE COLABORAÇÃO N°' },
  { tipo: 'TERMO_FOMENTO', rotulo: 'TERMO DE FOMENTO N°' },
  { tipo: 'CONVENIO', rotulo: 'CONVÊNIO N°' },
];

export interface AjusteDaRelacao {
  tipoAjuste: TipoAjusteRelacao;
  numero: string;
  beneficiario: string;
  cnpj: string | null;
  endereco: string | null;
  /** 'YYYY-MM-DD' — data de assinatura. */
  data: string | null;
  /** 'YYYY-MM-DD' — a maior entre a vigência do termo e a dos aditivos. */
  vigenciaAte: string | null;
  vigenciaInicio: string | null;
  valorGlobal: number;
  objeto: string;
  esferas: Esfera[];
  repassadoNoExercicio: number;
}

export interface DadosRelacao {
  exercicio: number;
  orgaoNome: string;
  municipio: string | null;
  responsavel: PessoaFolha;
  ajustes: AjusteDaRelacao[];
}

export interface LinhaRelacao {
  numero: string;
  beneficiario: string;
  cnpj: string | null;
  endereco: string | null;
  data: string | null;
  vigenciaAte: string | null;
  valorGlobal: number;
  objeto: string;
  fonte: string;
  repassadoNoExercicio: number;
}

export interface RelacaoTransferidos {
  anexo: 'RP-04';
  exercicio: number;
  orgaoNome: string;
  localEData: string;
  responsavel: PessoaFolha;
  grupos: {
    tipo: TipoAjusteRelacao;
    rotulo: string;
    linhas: LinhaRelacao[];
    totalValorGlobal: number;
    totalRepassado: number;
  }[];
  totalRepassado: number;
  nota: string;
  faltando: string[];
}

const cent = (n: number) => Math.round(n * 100) / 100;

/** A vigência alcança o exercício? Sem fim, vale enquanto começou até 31/12. */
export function vigenteNoExercicio(inicio: string | null, fim: string | null, exercicio: number): boolean {
  const de = `${exercicio}-01-01`;
  const ate = `${exercicio}-12-31`;
  if (inicio && inicio > ate) return false;
  if (fim && fim < de) return false;
  return Boolean(inicio || fim);
}

export function montarRelacaoTransferidos(d: DadosRelacao): RelacaoTransferidos {
  const entra = (a: AjusteDaRelacao) =>
    a.repassadoNoExercicio > 0 || vigenteNoExercicio(a.vigenciaInicio ?? a.data, a.vigenciaAte, d.exercicio);

  const grupos = GRUPOS_RELACAO.map((g) => {
    const linhas = d.ajustes
      .filter((a) => a.tipoAjuste === g.tipo && entra(a))
      .sort((x, y) => (x.data ?? '').localeCompare(y.data ?? '') || x.numero.localeCompare(y.numero, 'pt-BR', { numeric: true }))
      .map<LinhaRelacao>((a) => ({
        numero: a.numero,
        beneficiario: a.beneficiario,
        cnpj: a.cnpj,
        endereco: a.endereco,
        data: a.data,
        vigenciaAte: a.vigenciaAte,
        valorGlobal: cent(a.valorGlobal),
        objeto: a.objeto,
        // O modelo pede "federal ou estadual"; o municipal também é dito, para
        // a coluna nunca ficar em branco num ajuste que tem fonte.
        fonte: a.esferas.map((e) => ROTULO_ESFERA[e]).join(' / ') || '',
        repassadoNoExercicio: cent(a.repassadoNoExercicio),
      }));
    return {
      tipo: g.tipo,
      rotulo: g.rotulo,
      linhas,
      totalValorGlobal: cent(linhas.reduce((s, l) => s + l.valorGlobal, 0)),
      totalRepassado: cent(linhas.reduce((s, l) => s + l.repassadoNoExercicio, 0)),
    };
  });

  const faltando: string[] = [];
  if (!d.responsavel.nome || !d.responsavel.cpf)
    faltando.push('Autoridade máxima do órgão (nome, cargo e CPF) — Configurações → Órgãos Concessores.');
  const semFonte = grupos.flatMap((g) => g.linhas).filter((l) => !l.fonte);
  if (semFonte.length)
    faltando.push(
      `${semFonte.length} ajuste(s) sem fonte de recurso cadastrada (${semFonte.map((l) => l.numero).join(', ')}) — a coluna FONTE sai em branco.`,
    );
  if (grupos.every((g) => g.linhas.length === 0))
    faltando.push(`Nenhum ajuste vigente ou com repasse em ${d.exercicio}.`);

  return {
    anexo: 'RP-04',
    exercicio: d.exercicio,
    orgaoNome: d.orgaoNome,
    localEData: d.municipio ? `${d.municipio}, ______ de __________________ de ______.` : 'LOCAL e DATA:',
    responsavel: d.responsavel,
    grupos,
    totalRepassado: cent(grupos.reduce((s, g) => s + g.totalRepassado, 0)),
    nota: '(*) Fonte de recursos: federal ou estadual.',
    faltando,
  };
}
