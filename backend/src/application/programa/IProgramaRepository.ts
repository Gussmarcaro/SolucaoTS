import type { Meta, Programa } from '@/core/programa/Programa';
import type { DadosMeta } from './dtos';

/** Port de persistência do plano de metas (Programa → Meta), no escopo de um Ajuste. */
export interface IProgramaRepository {
  listarPorAjuste(ajusteId: string): Promise<Programa[]>;
  programaDoAjuste(ajusteId: string, programaId: string): Promise<boolean>;
  nomeExiste(ajusteId: string, nome: string, ignorarId?: string): Promise<boolean>;
  criarPrograma(ajusteId: string, nome: string): Promise<Programa>;
  atualizarPrograma(id: string, nome: string): Promise<Programa>;
  excluirPrograma(id: string): Promise<void>;

  metaDoPrograma(programaId: string, metaId: string): Promise<boolean>;
  codigoExiste(programaId: string, codigoMeta: string, ignorarId?: string): Promise<boolean>;
  criarMeta(programaId: string, dados: DadosMeta): Promise<Meta>;
  atualizarMeta(id: string, dados: DadosMeta): Promise<Meta>;
  excluirMeta(id: string): Promise<void>;
}
