import type { Compromisso, ResumoAgenda } from '@/core/compromisso/Compromisso';
import type { Espectador } from '@/core/compromisso/visibilidade';
import type { DadosCompromisso, ListarCompromissosParams } from './dtos';

/** Port de persistência da agenda. */
export interface ICompromissoRepository {
  /**
   * Busca já recortada pelo que o espectador pode ver — devolve `null` tanto
   * para "não existe" quanto para "não é seu". A camada de cima não precisa
   * saber diferenciar, e o cliente não deve descobrir.
   */
  buscarVisivel(id: string, quem: Espectador): Promise<Compromisso | null>;
  /** Sem recorte: só para decidir autorização de escrita, nunca para exibir. */
  buscarParaAutorizacao(id: string): Promise<
    | {
        id: string;
        visibilidade: Compromisso['visibilidade'];
        criadoPor: string | null;
        responsavelId: string | null;
        participantesIds: string[];
        gruposIds: string[];
      }
    | null
  >;
  criar(dados: DadosCompromisso): Promise<Compromisso>;
  atualizar(id: string, dados: DadosCompromisso): Promise<Compromisso>;
  excluir(id: string): Promise<void>;
  /** Compromissos da janela, já expandidos pela recorrência e recortados. */
  listar(params: ListarCompromissosParams): Promise<Compromisso[]>;
  resumo(quem: Espectador, agora: Date): Promise<ResumoAgenda>;
  ajusteExiste(ajusteId: string): Promise<boolean>;
  usuariosExistem(ids: string[]): Promise<boolean>;
  gruposExistem(ids: string[]): Promise<boolean>;
  contarTarefas(id: string): Promise<number>;
  /** Grupo do usuário — o sistema tem um por usuário. */
  grupoDoUsuario(usuarioId: string): Promise<string | null>;
}
