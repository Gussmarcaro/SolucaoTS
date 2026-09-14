import { http } from './http';
import type {
  BemAjuste,
  CronogramaItem,
  ExecucaoPlano,
  PlanoItem,
  ResultadoImportacaoBens,
  ResultadoImportacaoCronograma,
  ResultadoImportacaoPlano,
} from '@/types/ajusteCsv';

function formData(file: File): FormData {
  const fd = new FormData();
  fd.append('file', file);
  return fd;
}

// ---- Plano de Aplicação ----
export async function listarPlano(ajusteId: string): Promise<PlanoItem[]> {
  const { data } = await http.get<PlanoItem[]>(`/ajustes/${ajusteId}/plano-aplicacao`);
  return data;
}

export async function importarPlano(ajusteId: string, file: File): Promise<ResultadoImportacaoPlano> {
  const { data } = await http.post<ResultadoImportacaoPlano>(
    `/ajustes/${ajusteId}/plano-aplicacao/importar`,
    formData(file),
  );
  return data;
}

export async function limparPlano(ajusteId: string): Promise<void> {
  await http.delete(`/ajustes/${ajusteId}/plano-aplicacao`);
}

// ---- Cronograma de Desembolso ----
export async function listarCronograma(ajusteId: string): Promise<CronogramaItem[]> {
  const { data } = await http.get<CronogramaItem[]>(`/ajustes/${ajusteId}/cronograma`);
  return data;
}

export async function importarCronograma(
  ajusteId: string,
  file: File,
): Promise<ResultadoImportacaoCronograma> {
  const { data } = await http.post<ResultadoImportacaoCronograma>(
    `/ajustes/${ajusteId}/cronograma/importar`,
    formData(file),
  );
  return data;
}

export async function limparCronograma(ajusteId: string): Promise<void> {
  await http.delete(`/ajustes/${ajusteId}/cronograma`);
}

// ---- Bens Cedidos do ajuste ----
export async function listarBensAjuste(ajusteId: string): Promise<BemAjuste[]> {
  const { data } = await http.get<BemAjuste[]>(`/ajustes/${ajusteId}/bens`);
  return data;
}

export async function importarBensAjuste(ajusteId: string, file: File): Promise<ResultadoImportacaoBens> {
  const { data } = await http.post<ResultadoImportacaoBens>(
    `/ajustes/${ajusteId}/bens/importar`,
    formData(file),
  );
  return data;
}

export async function limparBensAjuste(ajusteId: string): Promise<void> {
  await http.delete(`/ajustes/${ajusteId}/bens`);
}

/**
 * Grava o plano digitado na tela (substitui o plano do ajuste).
 *
 * `valorMensal` vai como número; o servidor é que expande em 12 competências —
 * a regra "anual = mensal × 12" mora num lugar só.
 */
export async function salvarPlanoDigitado(
  ajusteId: string,
  payload: { ano: number; itens: { categoria: string; subcategoria: string; valorMensal: number }[] },
): Promise<PlanoItem[]> {
  const { data } = await http.put<PlanoItem[]>(`/ajustes/${ajusteId}/plano-aplicacao`, payload);
  return data;
}

/**
 * Grava o cronograma digitado (substitui o cronograma do ajuste).
 *
 * Sem a regra de ×12 do plano: aqui cada mês tem o seu valor, que é o motivo
 * de o bloco existir.
 */
export async function salvarCronogramaDigitado(
  ajusteId: string,
  payload: {
    itens: { categoria: string; subcategoria: string; ano: number; mes: number; valor: number }[];
  },
): Promise<CronogramaItem[]> {
  const { data } = await http.put<CronogramaItem[]>(`/ajustes/${ajusteId}/cronograma`, payload);
  return data;
}

/** Execução × Plano do ajuste, no exercício. */
export async function consultarExecucaoPlano(ajusteId: string, ano: number): Promise<ExecucaoPlano> {
  const { data } = await http.get<ExecucaoPlano>(`/ajustes/${ajusteId}/execucao-plano`, {
    params: { ano },
  });
  return data;
}

// ---- Cópia entre exercícios ----
//
// Plano e cronograma têm o mesmo par de operações; ficam juntos aqui porque
// quem mexe num quase sempre mexe no outro.

export async function exerciciosDoPlano(ajusteId: string): Promise<number[]> {
  const { data } = await http.get<number[]>(`/ajustes/${ajusteId}/plano-aplicacao/exercicios`);
  return data;
}

export async function copiarPlanoExercicio(
  ajusteId: string,
  payload: { de: number; para: number; reajustePercentual: number; termoAditivoId?: string },
): Promise<PlanoItem[]> {
  const { data } = await http.post<PlanoItem[]>(
    `/ajustes/${ajusteId}/plano-aplicacao/copiar`,
    payload,
  );
  return data;
}

export async function exerciciosDoCronograma(ajusteId: string): Promise<number[]> {
  const { data } = await http.get<number[]>(`/ajustes/${ajusteId}/cronograma/exercicios`);
  return data;
}

export async function copiarCronogramaExercicio(
  ajusteId: string,
  payload: { de: number; para: number; reajustePercentual: number; termoAditivoId?: string },
): Promise<CronogramaItem[]> {
  const { data } = await http.post<CronogramaItem[]>(
    `/ajustes/${ajusteId}/cronograma/copiar`,
    payload,
  );
  return data;
}
