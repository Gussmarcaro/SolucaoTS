import { http } from './http';
import type { Programa } from '@/types/programa';
import type { AfericaoMeta, AfericaoMetaPayload } from '@/types/prestacaoBlocos6';

/**
 * Execução Técnica — o realizado das metas, lançado ao longo do ano.
 *
 * Grava nas mesmas linhas do Relatório de Atividades da prestação: não há
 * tabela paralela, para não existirem dois números do mesmo fato.
 */
export interface PainelTecnico {
  exercicio: number;
  /**
   * `null` quando a prestação do exercício ainda não foi aberta.
   *
   * Não é erro: é o estado normal de quem começou o ano. Os previstos
   * aparecem assim mesmo — ver o que foi pactuado não depende de haver onde
   * lançar — e a tela explica o que falta para poder gravar.
   */
  prestacaoId: string | null;
  programas: Programa[];
  afericoes: AfericaoMeta[];
}

export const execucaoTecnicaApi = {
  painel: async (ajusteId: string, exercicio: number): Promise<PainelTecnico> => {
    const { data } = await http.get<PainelTecnico>('/execucao/tecnico', {
      params: { ajusteId, exercicio },
    });
    return data;
  },

  /** Cria ou substitui o realizado daquele período — a tela é um quadro, não uma grade. */
  registrar: async (
    ajusteId: string,
    exercicio: number,
    afericao: AfericaoMetaPayload,
  ): Promise<AfericaoMeta> => {
    const { data } = await http.put<AfericaoMeta>('/execucao/tecnico', {
      ajusteId,
      exercicio,
      ...afericao,
    });
    return data;
  },

  remover: async (ajusteId: string, exercicio: number, id: string): Promise<void> => {
    await http.delete(`/execucao/tecnico/${id}`, { params: { ajusteId, exercicio } });
  },
};
