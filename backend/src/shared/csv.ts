import { normalizarTexto } from './normalizar';

/**
 * Converte um valor no padrão brasileiro em número.
 * Ex.: "1.522.632,45" → 1522632.45 · "1.200" → 1200 · "0,3" → 0.3 · "100" → 100.
 * Regra BR: ponto = separador de milhar, vírgula = decimal.
 */
export function parseValorBR(bruto: string): number | null {
  const s = (bruto ?? '').trim();
  if (!s) return null;
  const normal = s.replace(/\./g, '').replace(',', '.');
  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

const MESES: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

/**
 * Normaliza o mês para 1–12, aceitando número ("1", "09") ou nome
 * ("Janeiro", "maio", "MARÇO" — sem/ com acento e qualquer caixa).
 */
export function normalizarMes(bruto: string): number | null {
  const s = (bruto ?? '').trim();
  if (!s) return null;
  if (/^\d{1,2}$/.test(s)) {
    const n = Number(s);
    return n >= 1 && n <= 12 ? n : null;
  }
  const chave = normalizarTexto(s);
  return MESES[chave] ?? null;
}

/** Quebra o texto em linhas não vazias, tirando aspas que envolvam a linha inteira. */
export function linhasCsv(texto: string): string[] {
  return texto
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^"(.*)"$/, '$1'))
    .filter((l) => l.length > 0);
}
