import { http } from './http';
import type {
  ConciliarPayload,
  LancamentoPendente,
  LinhaExtrato,
  ResultadoImportacaoOfx,
} from '@/types/conciliacao';

export const conciliacaoApi = {
  listar: async (params: { de?: string; ate?: string; ajusteId?: string }): Promise<LinhaExtrato[]> => {
    const { data } = await http.get<LinhaExtrato[]>('/conciliacao', { params });
    return data;
  },

  /**
   * O que foi lançado e o banco ainda não confirmou — o outro lado da
   * conciliação. Exige o período: sem ele a consulta varreria o órgão inteiro.
   */
  pendentes: async (params: { de: string; ate: string; ajusteId?: string }): Promise<LancamentoPendente[]> => {
    const { data } = await http.get<LancamentoPendente[]>('/conciliacao/pendentes', { params });
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
