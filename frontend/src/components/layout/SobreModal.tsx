import { Modal } from '@/components/ui/Modal';

interface Props {
  open: boolean;
  onClose: () => void;
}

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-ink-100 py-2 last:border-0 dark:border-ink-800">
      <dt className="text-xs font-medium uppercase tracking-wider text-ink-400">{rotulo}</dt>
      <dd className="text-right text-sm text-ink-800 dark:text-ink-100">{children}</dd>
    </div>
  );
}

/**
 * "Sobre o sistema": identidade visual, versão publicada e data do build.
 *
 * A versão e a data vêm de constantes injetadas no build (`vite.config.ts`),
 * não de uma chamada — assim a tela mostra exatamente o que está publicado,
 * mesmo se a API estiver fora.
 */
export function SobreModal({ open, onClose }: Props) {
  const build = new Date(__BUILD_DATE__);

  return (
    <Modal open={open} onClose={onClose} title="Sobre o sistema" size="md">
      <div className="space-y-4">
        <div className="flex items-center">
          <img src="/logo-menu.png" alt="Solução TS" className="h-10 w-auto object-contain dark:hidden" />
          <img
            src="/logo-menu-dark.png"
            alt="Solução TS"
            className="hidden h-10 w-auto object-contain dark:block"
          />
        </div>

        <dl>
          <Linha rotulo="Versão">
            <span className="font-mono">{__APP_VERSION__}</span>
          </Linha>
          <Linha rotulo="Publicado em">
            {build.toLocaleDateString('pt-BR')} às{' '}
            {build.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </Linha>
        </dl>
      </div>
    </Modal>
  );
}
