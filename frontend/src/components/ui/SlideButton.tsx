import { cn } from '@/lib/cn';
import { LabelCampo } from './LabelCampo';

interface Props {
  label?: string;
  /** Observação curta ao lado do rótulo, em fonte menor. */
  anotacao?: string;
  checked: boolean;
  onChange: (valor: boolean) => void;
  disabled?: boolean;
  name?: string;
  /** Textos dos dois estados. Padrão: Sim / Não. */
  rotulos?: { sim: string; nao: string };
}

/**
 * Chave deslizante Sim/Não.
 *
 * É um `<button role="switch">` e não um checkbox estilizado: o estado fica
 * legível para leitor de tela (`aria-checked`) e o Espaço/Enter já funcionam
 * sem tratamento extra.
 */
export function SlideButton({
  label,
  anotacao,
  checked,
  onChange,
  disabled,
  name,
  rotulos = { sim: 'Sim', nao: 'Não' },
}: Props) {
  return (
    <div className="w-full">
      {label && <LabelCampo texto={label} anotacao={anotacao} preenchido={checked} />}
      {/* `py-1` dá folga vertical: dentro de um fieldset o botão é o primeiro
          elemento e encostaria na legenda. */}
      <div className="flex items-center gap-3 py-1">
        <button
          type="button"
          role="switch"
          name={name}
          aria-checked={checked}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={cn(
            'focus-ring relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60',
            checked ? 'bg-brand-500' : 'bg-ink-300 dark:bg-ink-700',
          )}
        >
          {/* `left-0` é obrigatório: sem uma âncora horizontal, o elemento
              absoluto cai na "posição estática", que num <button> é o centro
              (o navegador aplica text-align: center). O deslocamento saía do
              meio da trilha e a bolinha vazava para fora, por cima do texto. */}
          <span
            className={cn(
              'pointer-events-none absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
              checked ? 'translate-x-[1.375rem]' : 'translate-x-0.5',
            )}
          />
        </button>
        <span className="shrink-0 select-none text-sm text-ink-700 dark:text-ink-200">
          {checked ? rotulos.sim : rotulos.nao}
        </span>
      </div>
    </div>
  );
}
