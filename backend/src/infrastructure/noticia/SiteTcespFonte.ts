import type { IFonteNoticias } from '@/application/noticia/NoticiasUseCase';

export const URL_NOTICIAS_TCESP = 'https://www.tce.sp.gov.br/noticias';
export const URL_COMUNICADOS_TCESP = 'https://www.tce.sp.gov.br/audesp/comunicados';

/**
 * Baixa uma página pública do site do TCESP.
 *
 * O `User-Agent` diz o que é o acesso, sem identificar cliente nem usuário.
 * O tempo-limite é curto porque quem espera é o Dashboard de alguém.
 */
export class SiteTcespFonte implements IFonteNoticias {
  constructor(private readonly url: string) {}

  async baixar(): Promise<string> {
    const r = await fetch(this.url, {
      headers: { 'User-Agent': 'SolucaoTS/1.0 (leitor de noticias do TCESP)' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) throw new Error(`TCESP respondeu ${r.status}`);
    return r.text();
  }
}
