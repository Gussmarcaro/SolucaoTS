import type {
  Cbo,
  ClassificacaoEconomica,
  ComponenteDespesa,
  EnteDespesa,
  EntidadeAudesp,
} from '@/core/dominio/Dominio';

export interface BuscaDominioParams {
  /** Termos já normalizados (sem acento/caixa); todos devem casar. */
  termos: string[];
  limite: number;
}

export interface BuscaClassificacaoParams extends BuscaDominioParams {
  exercicio: number;
  /** Restringe aos códigos válidos para a esfera do ente. */
  ente?: EnteDespesa;
}

/** Port de consulta das tabelas de domínio oficiais (somente leitura). */
export interface IDominioRepository {
  buscarCbos(params: BuscaDominioParams): Promise<Cbo[]>;
  obterCbo(codigo: string): Promise<Cbo | null>;

  buscarClassificacoes(params: BuscaClassificacaoParams): Promise<ClassificacaoEconomica[]>;
  obterClassificacao(exercicio: number, codigo: string): Promise<ClassificacaoEconomica | null>;

  listarComponentes(tipo?: string): Promise<ComponenteDespesa[]>;

  buscarEntidadesAudesp(params: BuscaDominioParams): Promise<EntidadeAudesp[]>;
  obterEntidadeAudesp(codigoMunicipio: number, codigoEntidade: number): Promise<EntidadeAudesp | null>;

  /** Exercícios com tabela de classificação econômica carregada. */
  exerciciosDisponiveis(): Promise<number[]>;
}
