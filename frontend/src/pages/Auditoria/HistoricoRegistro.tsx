import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { extrairMensagemErro } from '@/services/http';
import { auditoriaApi } from '@/services/auditoria.service';
import { ACAO_LABEL, ACAO_TONE, type RegistroAuditoria } from '@/types/auditoria';
import { Alteracoes } from './Alteracoes';

interface Props {
  /** Nome do model, como gravado na trilha (ex.: "Fornecedor"). */
  entidade: string;
  registroId: string;
}

function dataHora(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

/**
 * Linha do tempo de um registro. Vive nas telas de detalhe porque é assim que
 * a informação é procurada na prática — "o que aconteceu com ESTE fornecedor?"
 * — e não varrendo a auditoria inteira.
 */
export function HistoricoRegistro({ entidade, registroId }: Props) {
  const [itens, setItens] = useState<RegistroAuditoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    auditoriaApi
      .historico(entidade, registroId)
      .then((r) => vivo && setItens(r))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Falha ao carregar o histórico.')))
      .finally(() => vivo && setCarregando(false));
    return () => { vivo = false; };
  }, [entidade, registroId]);

  if (carregando) {
    return (
      <div className="py-8 text-center">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-brand-500" />
      </div>
    );
  }
  if (erro) return <p className="py-8 text-center text-sm font-medium text-red-500">{erro}</p>;
  if (itens.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-ink-500 dark:text-ink-400">
        Nenhuma alteração registrada para este cadastro.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {itens.map((r) => (
        <li key={r.id} className="rounded-xl border border-ink-200/70 p-3 dark:border-ink-800/70">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={ACAO_TONE[r.acao]}>{ACAO_LABEL[r.acao]}</Badge>
            <span className="text-xs text-ink-400">
              por {r.usuarioNome} · {dataHora(r.ocorridoEm)}
            </span>
          </div>
          <div className="mt-1.5">
            <Alteracoes acao={r.acao} alteracoes={r.alteracoes} />
          </div>
        </li>
      ))}
    </ol>
  );
}
