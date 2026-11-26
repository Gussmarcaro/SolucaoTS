import { http } from './http';
import type { TipoAjuste } from '@/types/ajuste';

export type EstadoTipo = 'ASSINADO' | 'DECLARADA' | 'PENDENTE' | 'EM_ANDAMENTO';

export interface LinhaTipo {
  tipoAjuste: TipoAjuste;
  estado: EstadoTipo;
  ajustes: { codigoAjuste: string; dataAssinatura: string; enviado: boolean }[];
  declaradaEm: string | null;
  negativaId: string | null;
}

export interface PeriodoNegativa {
  ano: number;
  periodo: number;
  rotulo: string;
  inicio: string;
  fim: string;
  prazo: string;
  linhas: LinhaTipo[];
}

export interface PainelNegativaAjustes {
  ano: number;
  periodicidade: 'QUADRIMESTRAL' | 'ANUAL';
  periodos: PeriodoNegativa[];
}

export async function painelNegativaAjustes(ano: number): Promise<PainelNegativaAjustes> {
  const { data } = await http.get<PainelNegativaAjustes>('/declaracao-negativa/ajustes', { params: { ano } });
  return data;
}

export async function marcarNegativaAjustes(dados: {
  ano: number;
  periodo: number;
  tipos: TipoAjuste[];
  declaradaEm: string;
}): Promise<void> {
  await http.post('/declaracao-negativa/ajustes', dados);
}

export async function desmarcarNegativaAjuste(id: string): Promise<void> {
  await http.delete(`/declaracao-negativa/ajustes/${id}`);
}

export type SituacaoNegativaPrestacao = 'NEGATIVA' | 'PRESTACAO' | 'SUGERIDA' | 'COM_EMPENHO';

export interface LinhaNegativaPrestacao {
  ajusteId: string;
  codigoAjuste: string;
  tipoAjuste: TipoAjuste;
  entidadeNome: string;
  dataAssinatura: string;
  situacao: SituacaoNegativaPrestacao;
  prestacaoId: string | null;
  status: string | null;
  empenhosNoAno: number;
}

/** Ajustes do órgão e o que cabe a cada um no exercício: negativa, prestação ou nada. */
export async function painelNegativaPrestacao(ano: number): Promise<{ ano: number; linhas: LinhaNegativaPrestacao[] }> {
  const { data } = await http.get<{ ano: number; linhas: LinhaNegativaPrestacao[] }>('/declaracao-negativa/prestacao', {
    params: { ano },
  });
  return data;
}
