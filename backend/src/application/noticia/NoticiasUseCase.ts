import type { Noticia } from '@/core/noticia/paginaTcesp';

/** Quem baixa a página. Porta para o teste não depender da rede. */
export interface IFonteNoticias {
  baixar(): Promise<string>;
}

export interface Manchetes {
  itens: Noticia[];
  /** Quando a lista foi lida do TCESP. Nulo se nunca deu certo. */
  lidoEm: string | null;
  /** A última leitura falhou e a lista é a anterior (ou vazia). */
  desatualizado: boolean;
}

/** Meia hora: o TCESP publica poucas notícias e comunicados por dia. */
export const VALIDADE_MS = 30 * 60_000;
/** Depois de uma falha, espera um pouco antes de tentar de novo. */
export const ESPERA_FALHA_MS = 5 * 60_000;
export const MAXIMO = 12;

/**
 * Uma lista de manchetes do TCESP (notícias ou comunicados) para o Dashboard.
 *
 * **Um cache para o servidor inteiro, em memória.** O conteúdo é o mesmo para
 * todo órgão e todo usuário. Sem o cache, cada Dashboard aberto seria uma
 * visita ao site do Tribunal. Com ele, são no máximo duas por hora por página,
 * venha o acesso que vier. Reiniciar a API só esvazia o cache, e a próxima tela
 * o refaz.
 *
 * **Falha não vira erro na tela.** Site fora do ar ou estrutura mudada: devolve
 * a última lista boa marcada como `desatualizado`. Notícia é complemento, e o
 * Dashboard não pode quebrar por causa dela.
 */
export class NoticiasUseCase {
  private cache: { itens: Noticia[]; lidoEm: number } | null = null;
  private proximaTentativa = 0;
  private emAndamento: Promise<void> | null = null;

  constructor(
    private readonly fonte: IFonteNoticias,
    private readonly ler: (html: string) => Noticia[],
    private readonly agora: () => number = Date.now,
  ) {}

  async execute(): Promise<Manchetes> {
    const t = this.agora();
    const vencido = !this.cache || t - this.cache.lidoEm >= VALIDADE_MS;

    if (vencido && t >= this.proximaTentativa) {
      // Dois Dashboards abertos no mesmo segundo esperam a mesma leitura.
      this.emAndamento ??= this.atualizar().finally(() => {
        this.emAndamento = null;
      });
      await this.emAndamento;
    }

    const fresco = !!this.cache && this.agora() - this.cache.lidoEm < VALIDADE_MS;
    return {
      itens: this.cache?.itens ?? [],
      lidoEm: this.cache ? new Date(this.cache.lidoEm).toISOString() : null,
      desatualizado: !fresco,
    };
  }

  private async atualizar(): Promise<void> {
    try {
      const itens = this.ler(await this.fonte.baixar()).slice(0, MAXIMO);
      // Página baixada mas nada reconhecido: o site mudou. Conta como falha
      // para não trocar uma lista boa por uma vazia.
      if (itens.length === 0) throw new Error('nada reconhecido na página');
      this.cache = { itens, lidoEm: this.agora() };
    } catch {
      this.proximaTentativa = this.agora() + ESPERA_FALHA_MS;
    }
  }
}
