import { createContext, useContext, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Marca a árvore como um formulário de **inclusão**. Só nele o asterisco dos
 * campos obrigatórios é destacado — na edição os dados já vieram do banco e o
 * destaque viraria ruído.
 */
const FormularioNovoContext = createContext(false);

export function FormularioNovo({ novo, children }: { novo: boolean; children: ReactNode }) {
  return <FormularioNovoContext.Provider value={novo}>{children}</FormularioNovoContext.Provider>;
}

/** Um campo está preenchido quando tem algo além de espaços. */
export function temValor(valor: unknown): boolean {
  if (valor == null) return false;
  if (Array.isArray(valor)) return valor.length > 0;
  return String(valor).trim().length > 0;
}

interface Props {
  /** Texto do rótulo; um `*` no fim indica campo obrigatório. */
  texto: string;
  /**
   * Observação curta sobre o comportamento do campo — ex.: `(Automática)` num
   * campo que o sistema preenche sozinho. Sai ao lado do rótulo, em fonte
   * menor e apagada: informa sem competir com o nome do campo.
   *
   * É o padrão do projeto para campos somente-leitura; use-o em vez de
   * embutir o parêntese no `texto` ou de repetir a explicação num `hint`.
   */
  anotacao?: string;
  /** Se o campo já tem valor — desliga o destaque. */
  preenchido: boolean;
  htmlFor?: string;
  className?: string;
}

const BASE = 'mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-300';

/**
 * Rótulo de campo. O asterisco fica em destaque enquanto o campo obrigatório
 * estiver vazio numa inclusão, e volta ao tom do rótulo assim que preenchido.
 * Rótulos sem `*` são renderizados como estão.
 */
export function LabelCampo({ texto, anotacao, preenchido, htmlFor, className }: Props) {
  const ehNovo = useContext(FormularioNovoContext);
  const obrigatorio = /^(.*?)\s*\*$/.exec(texto);

  return (
    <label htmlFor={htmlFor} className={cn(BASE, className)}>
      {obrigatorio ? obrigatorio[1] : texto}
      {obrigatorio && (
        <>
          {' '}
          <span className={ehNovo && !preenchido ? 'font-semibold text-red-500' : undefined}>*</span>
        </>
      )}
      {anotacao && <span className="ml-1 text-xs font-normal text-ink-400">{anotacao}</span>}
    </label>
  );
}
