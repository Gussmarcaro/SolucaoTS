import { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { extrairMensagemErro } from '@/services/http';
import type { ResumoImportacao } from '@/types/ajusteCsv';

interface Props {
  dica: string;
  onImportar: (file: File) => Promise<ResumoImportacao>;
  onConcluido: () => void;
}

/**
 * Botão de importação de CSV + resumo do último envio. A importação
 * **substitui** todo o conteúdo atual do bloco no ajuste.
 */
export function ImportadorCsv({ dica, onImportar, onConcluido }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [resumo, setResumo] = useState<ResumoImportacao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(file: File) {
    setEnviando(true);
    setErro(null);
    setResumo(null);
    try {
      const r = await onImportar(file);
      setResumo(r);
      onConcluido();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Falha ao importar o arquivo.'));
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const ok = resumo && resumo.ignoradas === 0 && resumo.erros.length === 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 rounded-xl border border-dashed border-ink-300 bg-ink-50/50 p-4 dark:border-ink-700 dark:bg-ink-800/30 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2 text-sm text-ink-500 dark:text-ink-400">
          <Upload className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{dica} A importação substitui o conteúdo atual.</span>
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) enviar(f);
            }}
          />
          <Button size="sm" onClick={() => inputRef.current?.click()} disabled={enviando}>
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {enviando ? 'Importando...' : 'Importar CSV'}
          </Button>
        </div>
      </div>

      {erro && <p className="text-sm font-medium text-red-500">{erro}</p>}

      {resumo && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            ok
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
              : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {resumo.importados} item(ns) importado(s) de {resumo.totalLinhas} linha(s)
            {resumo.ignoradas > 0 && ` · ${resumo.ignoradas} ignorada(s)`}
          </div>
          {resumo.erros.length > 0 && (
            <ul className="mt-2 max-h-32 list-disc space-y-0.5 overflow-y-auto pl-5 text-xs">
              {resumo.erros.slice(0, 20).map((m, i) => (
                <li key={i}>{m}</li>
              ))}
              {resumo.erros.length > 20 && <li>… e mais {resumo.erros.length - 20}.</li>}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
