import { CONTA_TIPO } from '@/lib/dominiosFaseV';

export type TipoAjuste =
  | 'CONTRATO_GESTAO'
  | 'CONVENIO'
  | 'TERMO_COLABORACAO'
  | 'TERMO_FOMENTO'
  | 'TERMO_PARCERIA';

export type Periodicidade = 'ANUAL' | 'QUADRIMESTRAL';
export type StatusAjuste = 'EM_ELABORACAO' | 'ENVIADO';

export const TIPO_AJUSTE_LABEL: Record<TipoAjuste, string> = {
  CONTRATO_GESTAO: 'Contrato de Gestão',
  CONVENIO: 'Convênio',
  TERMO_COLABORACAO: 'Termo de Colaboração',
  TERMO_FOMENTO: 'Termo de Fomento',
  TERMO_PARCERIA: 'Termo de Parceria',
};

export const PERIODICIDADE_LABEL: Record<Periodicidade, string> = {
  ANUAL: 'Anual',
  QUADRIMESTRAL: 'Quadrimestral',
};

export const STATUS_AJUSTE_LABEL: Record<StatusAjuste, string> = {
  EM_ELABORACAO: 'Em elaboração',
  ENVIADO: 'Enviado',
};

/** Conta bancária declarada no ajuste. */
export interface ContaBancariaAjuste {
  id?: string;
  banco: number;
  agencia: number;
  conta: string;
  contaTipo: number | null;
  apelido: string | null;
}

/**
 * Como a conta se apresenta numa lista de escolha.
 *
 * **O tipo faz parte do rótulo, não é enfeite.** Corrente e aplicação da mesma
 * conta têm banco, agência e número iguais — sem o tipo, as duas apareceriam
 * como a mesma linha repetida e não haveria como escolher entre elas. Pelo
 * mesmo motivo não se escreve "C/C" fixo: chamar de conta corrente a aplicação
 * é dizer o contrário do que o cadastro diz.
 */
export function rotuloContaAjuste(
  c: ContaBancariaAjuste,
  rotuloBanco: (codigo: number) => string,
): string {
  const tipo = CONTA_TIPO.find((o) => o.value === String(c.contaTipo))?.label;
  const base = `${rotuloBanco(c.banco)} · Ag. ${c.agencia} · Conta ${c.conta}`;
  const completo = tipo ? `${base} (${tipo})` : base;
  // O apelido é o nome que o órgão deu à conta; quando existe, é por ele que a
  // pessoa a procura. O tipo continua ao lado, porque é o que separa as duas.
  return c.apelido ? (tipo ? `${c.apelido} (${tipo})` : c.apelido) : completo;
}

/** Chave estável de uma conta do ajuste, para o `value` do seletor. */
export const chaveContaAjuste = (c: ContaBancariaAjuste): string =>
  c.id ?? `${c.banco}-${c.agencia}-${c.conta}-${c.contaTipo ?? ''}`;

export interface Ajuste {
  id: string;
  clienteId: string | null;
  orgaoNome: string | null;
  entidadeBeneficiariaId: string;
  entidadeNome: string;
  tipoAjuste: TipoAjuste;
  descricaoResumida: string | null;
  codigoAjuste: string;
  numero: string | null;
  objeto: string;
  valorGlobal: number;
  dataAssinatura: string; // 'YYYY-MM-DD'
  vigenciaInicial: string | null;
  vigenciaFinal: string | null;
  periodicidade: Periodicidade;
  status: StatusAjuste;

  previsaoFederal: number | null;
  previsaoEstadual: number | null;
  previsaoMunicipal: number | null;
  /**
   * Fontes de recurso previstas — são as que o lançamento de pagamento pode
   * escolher. Sem esta lista, o pagamento aceitaria qualquer uma das 16 da
   * tabela, e a errada só apareceria na análise do Tribunal.
   */
  fontesRecurso: number[];
  /** Contas bancárias do ajuste, oferecidas no pagamento. */
  contasBancarias: ContaBancariaAjuste[];

  responsavelNome: string | null;
  responsavelCpf: string | null;
  responsavelDataNascimento: string | null;
  responsavelCep: string | null;
  responsavelLogradouro: string | null;
  responsavelNumero: string | null;
  responsavelComplemento: string | null;
  responsavelBairro: string | null;
  responsavelCidade: string | null;
  responsavelUf: string | null;
  responsavelEmail: string | null;
  responsavelTelefone: string | null;
  responsavelCargo: string | null;
  responsavelDataEntrada: string | null;
  responsavelDataSaida: string | null;

  /** Metadados do PDF do termo — o conteúdo vem pela rota de download. */
  termoCienciaArquivoNome: string | null;
  termoCienciaArquivoTamanho: number | null;

  publicacaoLocal: string | null;
  publicacaoLink: string | null;
  publicacaoData: string | null;

  criadoEm: string;
  atualizadoEm: string;
}

export interface AjustePayload {
  clienteId?: string | null;
  entidadeBeneficiariaId: string;
  tipoAjuste: TipoAjuste;
  descricaoResumida?: string | null;
  codigoAjuste: string;
  numero?: string | null;
  objeto: string;
  valorGlobal: number;
  dataAssinatura: string;
  vigenciaInicial?: string | null;
  vigenciaFinal?: string | null;
  periodicidade: Periodicidade;
  status?: StatusAjuste;

  previsaoFederal?: number | null;
  previsaoEstadual?: number | null;
  previsaoMunicipal?: number | null;
  fontesRecurso: number[];
  contasBancarias: Omit<ContaBancariaAjuste, 'id'>[];

  responsavelNome?: string | null;
  responsavelCpf?: string | null;
  responsavelDataNascimento?: string | null;
  responsavelCep?: string | null;
  responsavelLogradouro?: string | null;
  responsavelNumero?: string | null;
  responsavelComplemento?: string | null;
  responsavelBairro?: string | null;
  responsavelCidade?: string | null;
  responsavelUf?: string | null;
  responsavelEmail?: string | null;
  responsavelTelefone?: string | null;
  responsavelCargo?: string | null;
  responsavelDataEntrada?: string | null;
  responsavelDataSaida?: string | null;

  publicacaoLocal?: string | null;
  publicacaoLink?: string | null;
  publicacaoData?: string | null;
}

export interface FiltrosAjuste {
  codigoAjuste?: string;
  tipoAjuste?: string;
  status?: string;
  entidadeBeneficiariaId?: string;
}

export interface Paginado<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
