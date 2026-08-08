import type { Cbo, ClassificacaoEconomica, ComponenteDespesa, EnteDespesa } from '@/core/dominio/Dominio';
import { normalizarTexto } from '@/shared/normalizar';
import type { IDominioRepository } from './IDominioRepository';

const LIMITE_PADRAO = 20;
const LIMITE_MAX = 100;

const ENTES: EnteDespesa[] = ['E', 'M', 'C'];

/**
 * Consulta das tabelas de domínio oficiais para os campos de código da
 * prestação. Sempre limitada: as tabelas têm milhares de linhas e a UI
 * consome como autocomplete.
 */
export class ConsultarDominiosUseCase {
  constructor(private readonly repo: IDominioRepository) {}

  /**
   * Quebra a busca em termos. O código é procurado junto do título (ambos
   * ficam no campo normalizado), então "225" e "medico" funcionam igual.
   */
  private termos(busca?: string): string[] {
    return normalizarTexto(busca ?? '')
      .split(' ')
      .filter((t) => t.length > 0);
  }

  private limite(valor?: number): number {
    if (!valor || !Number.isFinite(valor)) return LIMITE_PADRAO;
    return Math.min(LIMITE_MAX, Math.max(1, Math.trunc(valor)));
  }

  async buscarCbos(params: { busca?: string; limite?: number }): Promise<Cbo[]> {
    return this.repo.buscarCbos({ termos: this.termos(params.busca), limite: this.limite(params.limite) });
  }

  async obterCbo(codigo: string): Promise<Cbo | null> {
    const limpo = (codigo ?? '').replace(/\D/g, '');
    if (limpo.length !== 6) return null;
    return this.repo.obterCbo(limpo);
  }

  async buscarClassificacoes(params: {
    busca?: string;
    exercicio?: number;
    ente?: string;
    limite?: number;
  }): Promise<ClassificacaoEconomica[]> {
    const exercicio = await this.resolverExercicio(params.exercicio);
    if (exercicio == null) return [];
    return this.repo.buscarClassificacoes({
      termos: this.termos(params.busca),
      limite: this.limite(params.limite),
      exercicio,
      ente: this.ente(params.ente),
    });
  }

  async obterClassificacao(codigo: string, exercicio?: number): Promise<ClassificacaoEconomica | null> {
    const limpo = (codigo ?? '').replace(/\D/g, '');
    if (limpo.length !== 8) return null;
    const ano = await this.resolverExercicio(exercicio);
    if (ano == null) return null;
    return this.repo.obterClassificacao(ano, limpo);
  }

  async listarComponentes(tipo?: string): Promise<ComponenteDespesa[]> {
    return this.repo.listarComponentes(tipo?.trim() || undefined);
  }

  async exerciciosDisponiveis(): Promise<number[]> {
    return this.repo.exerciciosDisponiveis();
  }

  private ente(valor?: string): EnteDespesa | undefined {
    const v = (valor ?? '').trim().toUpperCase() as EnteDespesa;
    return ENTES.includes(v) ? v : undefined;
  }

  /**
   * A tabela é publicada por exercício. Se o ano pedido não estiver carregado
   * (ou não vier), usa o mais recente disponível — melhor oferecer a edição
   * anterior do que não oferecer nada.
   */
  private async resolverExercicio(exercicio?: number): Promise<number | null> {
    const disponiveis = await this.repo.exerciciosDisponiveis();
    if (disponiveis.length === 0) return null;
    if (exercicio && disponiveis.includes(exercicio)) return exercicio;
    return Math.max(...disponiveis);
  }
}
