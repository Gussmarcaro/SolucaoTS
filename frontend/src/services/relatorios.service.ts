import { http } from './http';
import type { LinhaExecucao, LinhaRepasse, ResumoSituacao } from '@/pages/Relatorios/tipos';

export interface FiltroRelatorio {
  ajusteId?: string;
  ano?: number;
}

const params = (f: FiltroRelatorio) => ({
  ajusteId: f.ajusteId || undefined,
  ano: f.ano || undefined,
});

export async function relatorioExecucao(f: FiltroRelatorio = {}): Promise<LinhaExecucao[]> {
  const { data } = await http.get<LinhaExecucao[]>('/relatorios/execucao', { params: params(f) });
  return data;
}

export async function relatorioRepasses(f: FiltroRelatorio = {}): Promise<LinhaRepasse[]> {
  const { data } = await http.get<LinhaRepasse[]>('/relatorios/repasses', { params: params(f) });
  return data;
}

export async function relatorioSituacao(f: FiltroRelatorio = {}): Promise<ResumoSituacao> {
  const { data } = await http.get<ResumoSituacao>('/relatorios/situacao', { params: params(f) });
  return data;
}
