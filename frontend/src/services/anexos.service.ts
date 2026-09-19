import { http } from './http';

export type TipoAnexo =
  | 'DOCUMENTO_FISCAL'
  | 'RECIBO'
  | 'DOCUMENTO_AUXILIAR'
  | 'COMPROVANTE_PAGAMENTO';

export type DonoAnexo = 'DESPESA' | 'PAGAMENTO';

export interface Anexo {
  id: string;
  tipo: TipoAnexo;
  nome: string;
  tamanho: number;
  enviadoEm: string;
}

/**
 * O caminho sempre passa pelo **dono** do anexo.
 *
 * Não existe `/anexos/:id`: o anexo é filho, e o recorte por órgão alcança só
 * as raízes. Endereçá-lo pela nota (ou pelo pagamento) é o que força o servidor
 * a conferir a propriedade antes de entregar o arquivo.
 */
const base = (dono: DonoAnexo, donoId: string) =>
  `${dono === 'DESPESA' ? '/despesas' : '/pagamentos'}/${donoId}/anexos`;

export const anexosApi = {
  listar: async (dono: DonoAnexo, donoId: string): Promise<Anexo[]> => {
    const { data } = await http.get<Anexo[]>(base(dono, donoId));
    return data;
  },

  enviar: async (
    dono: DonoAnexo,
    donoId: string,
    tipo: TipoAnexo,
    arquivo: File,
  ): Promise<Anexo> => {
    const form = new FormData();
    form.append('arquivo', arquivo);
    form.append('tipo', tipo);
    const { data } = await http.post<Anexo>(base(dono, donoId), form);
    return data;
  },

  excluir: async (dono: DonoAnexo, donoId: string, anexoId: string): Promise<void> => {
    await http.delete(`${base(dono, donoId)}/${anexoId}`);
  },

  /** Baixa e abre numa nova aba (o Blob evita perder o header de auth). */
  abrir: async (dono: DonoAnexo, donoId: string, anexoId: string): Promise<void> => {
    const { data } = await http.get<Blob>(`${base(dono, donoId)}/${anexoId}`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(data);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
};
