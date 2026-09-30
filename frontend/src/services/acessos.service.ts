import { http } from './http';
import type { SessaoAcesso } from '@/types/acesso';
import type { Paginado } from '@/types/empresa';

export interface FiltrosAcesso {
  usuarioId?: string;
  situacao?: string;
  de?: string;
  ate?: string;
}

export const acessosApi = {
  async listar(params: FiltrosAcesso & { page?: number; pageSize?: number }) {
    const { data } = await http.get<Paginado<SessaoAcesso>>('/acessos', { params });
    return data;
  },

  /** Quem já acessou — alimenta o filtro de usuário. */
  async usuarios(): Promise<{ id: string; nome: string }[]> {
    const { data } = await http.get<{ itens: { id: string; nome: string }[] }>('/acessos/usuarios');
    return data.itens;
  },
};

/**
 * Fecha a sessão no servidor.
 *
 * Fica fora de `acessosApi` porque não é consulta do histórico: é o que faz o
 * histórico existir. Sem esta chamada, **toda** sessão apareceria como
 * encerrada inesperadamente — inclusive a de quem clicou em Sair.
 *
 * Nunca lança: o logout do navegador não pode depender de o servidor
 * responder. Falhar aqui custa uma linha marcada como abandonada; falhar e
 * propagar prenderia a pessoa numa tela da qual ela pediu para sair.
 */
export async function encerrarSessao(): Promise<void> {
  try {
    await http.post('/auth/logout');
  } catch {
    /* silêncio proposital — ver acima */
  }
}
