import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { http } from '@/services/http';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Estado da API: verde se responde, vermelho se não. */
type Saude = 'verificando' | 'ok' | 'indisponivel';

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-ink-100 py-2 last:border-0 dark:border-ink-800">
      <dt className="text-xs font-medium uppercase tracking-wider text-ink-400">{rotulo}</dt>
      <dd className="text-right text-sm text-ink-800 dark:text-ink-100">{children}</dd>
    </div>
  );
}

/**
 * "Sobre o sistema": versão publicada e estado da conexão com a API.
 *
 * A versão e a data vêm de constantes injetadas no build (`vite.config.ts`),
 * não de uma chamada — assim a tela mostra exatamente o que está publicado,
 * mesmo se a API estiver fora.
 */
export function SobreModal({ open, onClose }: Props) {
  const [saude, setSaude] = useState<Saude>('verificando');

  useEffect(() => {
    if (!open) return;
    let vivo = true;
    setSaude('verificando');
    http
      .get('/health')
      .then(() => vivo && setSaude('ok'))
      .catch(() => vivo && setSaude('indisponivel'));
    return () => { vivo = false; };
  }, [open]);

  const build = new Date(__BUILD_DATE__);

  return (
    <Modal open={open} onClose={onClose} title="Sobre o sistema" size="md">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <img src="/logo-menu.png" alt="" className="h-9 w-auto object-contain dark:hidden" />
          <img src="/logo-menu-dark.png" alt="" className="hidden h-9 w-auto object-contain dark:block" />
          <div>
            <p className="text-sm font-semibold text-ink-900 dark:text-ink-50">Solução TS</p>
            <p className="text-xs text-ink-400">Prestação de contas ao Terceiro Setor — Audesp Fase V</p>
          </div>
        </div>

        <dl>
          <Linha rotulo="Versão">
            <span className="font-mono">{__APP_VERSION__}</span>
          </Linha>
          <Linha rotulo="Publicado em">
            {build.toLocaleDateString('pt-BR')} às{' '}
            {build.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </Linha>
          <Linha rotulo="Servidor">
            <span className="inline-flex items-center gap-1.5">
              <span
                className={
                  saude === 'ok'
                    ? 'h-2 w-2 rounded-full bg-emerald-500'
                    : saude === 'indisponivel'
                      ? 'h-2 w-2 rounded-full bg-red-500'
                      : 'h-2 w-2 animate-pulse rounded-full bg-ink-300'
                }
              />
              {saude === 'ok' ? 'Conectado' : saude === 'indisponivel' ? 'Indisponível' : 'Verificando...'}
            </span>
          </Linha>
          <Linha rotulo="Schema do TCESP">
            <span className="font-mono">v1.14</span>
          </Linha>
        </dl>

        <p className="text-xs text-ink-400">
          Em caso de dúvida sobre uma regra do Tribunal, consulte o Manual da Prestação de Contas dos
          Repasses ao Terceiro Setor.
        </p>
      </div>
    </Modal>
  );
}
