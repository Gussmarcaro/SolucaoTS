const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Converte 'YYYY-MM-DD' em Date (UTC meia-noite). Lança se inválida. */
export function parseDataISO(valor: string): Date {
  const v = (valor ?? '').trim();
  if (!DATA_ISO.test(v)) throw new Error('data inválida');
  const d = new Date(`${v}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error('data inválida');
  return d;
}

/** Formata um Date como 'YYYY-MM-DD' (UTC). */
export function paraDataISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}
