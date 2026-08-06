import { http } from './http';
import type {
  CronogramaItem,
  PlanoItem,
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
