import { useEffect, useRef, useState } from 'react';
import { Building2, Check, ChevronDown, Loader2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { atenderOrgao, listarOrgaosSuporte, type OrgaoResumo } from '@/services/suporte.service';
import { cn } from '@/lib/cn';

/**
 * Órgão em atendimento — visível só para a equipe do fornecedor.
 *
 * Fica na barra superior, sempre à vista, de propósito. Quem atende vários
 * clientes precisa saber **em qual está** antes de digitar qualquer coisa: um
 * lançamento no órgão errado é indistinguível de um lançamento correto até
 * alguém conferir. Um seletor escondido num menu não cumpriria esse papel.
 *
 * A troca reemite o token com outro `cli` — o suporte continua operando dentro
 * de um órgão de cada vez, nunca sobre todos.
 */
export function SeletorOrgao() {
  const { usuario, trocarOrgao } = useAuth();
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(false);
  const [orgaos, setOrgaos] = useState<OrgaoResumo[] | null>(null);
  const [trocando, setTrocando] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function fora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, []);

  useEffect(() => {
    if (!aberto || orgaos) return;
    listarOrgaosSuporte()
      .then(setOrgaos)
      .catch(() => setOrgaos([]));
  }, [aberto, orgaos]);

  if (!usuario?.suporte) return null;

  async function escolher(o: OrgaoResumo) {
    if (o.id === usuario?.clienteId) return setAberto(false);
    setTrocando(o.id);
    try {
      const { token, orgao } = await atenderOrgao(o.id);
      trocarOrgao(token, { ...usuario!, clienteId: orgao.id, orgaoNome: orgao.nome });
      setAberto(false);
      // Recarrega: as telas abertas foram carregadas com os dados do órgão
      // anterior, e deixá-las na tela seria mostrar dados de um cliente sob o
      // rótulo de outro.
      window.location.reload();
    } finally {
      setTrocando(null);
    }
  }

  const atual = usuario.orgaoNome ?? 'Nenhum órgão';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        title="Órgão em atendimento (equipe do fornecedor)"
        className="focus-ring flex h-9 max-w-[16rem] items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 text-[12px] font-medium text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
      >
        <Building2 className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{atual}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
      </button>

      {aberto && (
        <div className="absolute right-0 top-11 z-40 max-h-[60vh] w-[20rem] overflow-y-auto rounded-2xl border border-ink-200 bg-white py-2 shadow-pop dark:border-ink-800 dark:bg-ink-900">
          <p className="px-4 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            Atender órgão
          </p>

          {orgaos === null && (
            <p className="flex items-center gap-2 px-4 py-4 text-sm text-ink-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </p>
          )}

          {orgaos?.length === 0 && (
            <p className="px-4 py-4 text-sm text-ink-500 dark:text-ink-400">
              Nenhum órgão cadastrado ainda.
            </p>
          )}

          {orgaos?.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => escolher(o)}
              disabled={!!trocando}
              className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left transition-colors hover:bg-ink-50 disabled:opacity-60 dark:hover:bg-ink-800/60"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm text-ink-800 dark:text-ink-100">{o.nome}</span>
                <span className="block text-xs text-ink-400">
                  {o.usuarios} usuário(s){o.ativo ? '' : ' · inativo'}
                </span>
              </span>
              {trocando === o.id ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-500" />
              ) : (
                o.id === usuario.clienteId && <Check className="h-4 w-4 shrink-0 text-emerald-500" />
              )}
            </button>
          ))}

          <button
            type="button"
            onClick={() => {
              setAberto(false);
              navigate('/suporte/provisionar');
            }}
            className={cn(
              'mt-2 flex w-full items-center gap-2 border-t border-ink-100 px-4 pb-1 pt-3 text-left text-sm',
              'font-medium text-brand-600 hover:underline dark:border-ink-800 dark:text-brand-300',
            )}
          >
            <Plus className="h-4 w-4" />
            Provisionar órgão novo
          </button>
        </div>
      )}
    </div>
  );
}
