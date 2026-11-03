import { http } from './http';
import type {
  LinhaExecucao,
  LinhaRepasse,
  ResumoFornecedores,
  RelatorioDespesas,
  ResumoSituacao,
} from '@/pages/Relatorios/tipos';

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

export async function relatorioFornecedores(f: FiltroRelatorio = {}): Promise<ResumoFornecedores> {
  const { data } = await http.get<ResumoFornecedores>('/relatorios/fornecedores', {
    params: params(f),
  });
  return data;
}

/**
 * Os três quadros de despesa do período.
 *
 * Pede **período**, não ano: é o relatório de fechamento mensal, e o mesmo
 * cálculo com o período do exercício preenche o anexo do Tribunal.
 */
export async function relatorioDespesas(f: {
  de: string;
  ate: string;
  ajusteId?: string;
}): Promise<RelatorioDespesas> {
  const { data } = await http.get<RelatorioDespesas>('/relatorios/despesas', {
    params: { de: f.de, ate: f.ate, ajusteId: f.ajusteId || undefined },
  });
  return data;
}
