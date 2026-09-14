import { http } from './http';
import type { ConciliarPayload, LinhaExtrato, ResultadoImportacaoOfx } from '@/types/conciliacao';

export const conciliacaoApi = {
  listar: async (params: { de?: string; ate?: string }): Promise<LinhaExtrato[]> => {
    const { data } = await http.get<LinhaExtrato[]>('/conciliacao', { params });
    return data;
  },

  /** O OFX vai como multipart; o buffer é lido no servidor e não se guarda o arquivo. */
  importar: async (file: File): Promise<ResultadoImportacaoOfx> => {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await http.post<ResultadoImportacaoOfx>('/conciliacao/importar', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  conciliar: async (id: string, payload: ConciliarPayload): Promise<LinhaExtrato> => {
    const { data } = await http.put<LinhaExtrato>(`/conciliacao/${id}`, payload);
    return data;
  },
};
