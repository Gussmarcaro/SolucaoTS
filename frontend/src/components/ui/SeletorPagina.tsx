import { OPCOES_PAGINA } from '@/lib/paginacao';

interface Props {
  valor: number;
  onChange: (n: number) => void;
}

/**
 * Quantos registros por página. Fica no rodapé da grade, ao lado da contagem.
 *
 * `select` nativo de propósito: é uma escolha de quatro números, e o combo
 * estilizado do sistema traria busca e lista flutuante para um caso que não
 * precisa de nenhum dos dois.
 */
export function SeletorPagina({ valor, onChange }: Props) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-ink-400">
      <span>Exibir</span>
      <select
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Registros por página"
        className="focus-ring rounded-lg border border-ink-200 bg-white px-1.5 py-1 text-xs text-ink-700 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-200"
      >
        {OPCOES_PAGINA.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      <span>por página</span>
    </label>
  );
}
