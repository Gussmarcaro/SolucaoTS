import { http } from './http';
import type { AcessoDoRecurso, Recurso } from '@/types/permissao';

export const permissoesApi = {
  /** Catálogo de recursos — as linhas da matriz. */
  recursos: () => http.get<Recurso[]>('/permissoes/recursos').then((r) => r.data),

  doGrupo: (grupoId: string) =>
    http.get<AcessoDoRecurso[]>(`/permissoes/${grupoId}`).then((r) => r.data),

  /** Grava a matriz inteira do grupo — a tela envia o estado completo. */
  salvar: (grupoId: string, acessos: AcessoDoRecurso[]) =>
    http.put(`/permissoes/${grupoId}`, { acessos }).then(() => undefined),

  /** O que o usuário logado pode fazer, para o menu e os botões. */
  minhas: () => http.get<AcessoDoRecurso[]>('/permissoes/eu/resumo').then((r) => r.data),
};
