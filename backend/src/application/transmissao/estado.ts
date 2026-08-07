/** Mapeia o texto de estado retornado pela API para o enum StatusPrestacao. */
export function mapearEstado(
  estado: string | null | undefined,
): 'ARMAZENADO' | 'REJEITADO' | 'SUBSTITUIDO' | 'EXCLUIDO' | null {
  if (!estado) return null;
  const t = estado
    .normalize('NFD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '') // remove diacríticos
    .toLowerCase()
    .trim();
  if (t.includes('armazenad')) return 'ARMAZENADO';
  if (t.includes('rejeitad')) return 'REJEITADO';
  if (t.includes('substitu')) return 'SUBSTITUIDO';
  if (t.includes('excluid')) return 'EXCLUIDO';
  return null;
}
