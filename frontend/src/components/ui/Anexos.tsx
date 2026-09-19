import { useEffect, useState } from 'react';
import { ExternalLink, FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { anexosApi, type Anexo, type DonoAnexo, type TipoAnexo } from '@/services/anexos.service';
import { extrairMensagemErro } from '@/services/http';

export const TIPO_ANEXO_LABEL: Record<TipoAnexo, string> = {
  DOCUMENTO_FISCAL: 'Documento Fiscal',
  RECIBO: 'Recibo',
  DOCUMENTO_AUXILIAR: 'Documento Auxiliar',
  COMPROVANTE_PAGAMENTO: 'Comprovante de Pagamento',
};

const tamanhoLegivel = (b: number) =>
  b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

/**
 * Os arquivos de um lançamento, agrupados por papel.
 *
 * A fiscalização não pergunta "quanto foi pago" — o sistema já responde isso.
 * Ela pergunta **"cadê o documento"**, e até aqui a resposta morava numa pasta
 * de rede. Guardar o arquivo junto do lançamento é o que torna a prestação
 * conferível sem sair do sistema.
 *
 * **Só aparece depois de salvo.** O envio precisa do id do lançamento, e num
 * cadastro novo ele só existe após a gravação — o mesmo motivo pelo qual os
 * PDFs do ajuste sobem em seguida. Num lançamento novo, o componente explica
 * isso em vez de mostrar um botão que não funcionaria.
 *
 * Cada papel aceita **mais de um arquivo**: "documento auxiliar" costuma ser o
 * laudo *e* o parecer, e forçar um só faria o segundo virar anexo de e-mail.
 */
export function Anexos({
  dono,
  donoId,
  tipos,
}: {
  dono: DonoAnexo;
  /** Ausente enquanto o lançamento não foi criado. */
  donoId?: string;
  /** Os papéis que este lançamento aceita, na ordem em que aparecem. */
  tipos: TipoAnexo[];
}) {
  const [lista, setLista] = useState<Anexo[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState<TipoAnexo | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!donoId) return;
    let vivo = true;
    setCarregando(true);
    anexosApi
      .listar(dono, donoId)
      .then((r) => vivo && setLista(r))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Falha ao carregar os anexos.')))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [dono, donoId]);

  async function enviar(tipo: TipoAnexo, arquivo: File) {
    if (!donoId) return;
    setErro(null);
    setEnviando(tipo);
    try {
      const novo = await anexosApi.enviar(dono, donoId, tipo, arquivo);
      setLista((l) => [...l, novo]);
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível anexar o arquivo.'));
    } finally {
      setEnviando(null);
    }
  }

  async function excluir(id: string) {
    if (!donoId) return;
    setErro(null);
    try {
      await anexosApi.excluir(dono, donoId, id);
      setLista((l) => l.filter((a) => a.id !== id));
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível remover o anexo.'));
    }
  }

  if (!donoId) {
    return (
      <p className="text-xs text-ink-400">
        Os arquivos podem ser anexados depois de <strong>salvar</strong> o lançamento — o envio
        precisa do registro já criado.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {erro && <p className="text-xs font-medium text-red-500">{erro}</p>}

      {carregando ? (
        <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
      ) : (
        tipos.map((tipo) => {
          const arquivos = lista.filter((a) => a.tipo === tipo);
          return (
            <div key={tipo}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-ink-700 dark:text-ink-300">
                  {TIPO_ANEXO_LABEL[tipo]}
                </span>
                <label className="focus-ring inline-flex cursor-pointer items-center gap-1.5 rounded text-xs text-brand-600 hover:underline dark:text-brand-400">
                  {enviando === tipo ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  anexar
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    className="sr-only"
                    disabled={enviando !== null}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      // Limpa o input: sem isso, anexar o mesmo arquivo duas
                      // vezes seguidas não dispara o evento na segunda.
                      e.target.value = '';
                      if (f) enviar(tipo, f);
                    }}
                  />
                </label>
              </div>

              {arquivos.length === 0 ? (
                <p className="text-xs text-ink-400">Nenhum arquivo.</p>
              ) : (
                <ul className="space-y-1">
                  {arquivos.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center gap-2 rounded-lg border border-ink-200 bg-ink-50/60 px-3 py-1.5 text-sm dark:border-ink-700 dark:bg-ink-800/40"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-ink-400" />
                      <span
                        className="min-w-0 flex-1 truncate text-ink-700 dark:text-ink-200"
                        title={a.nome}
                      >
                        {a.nome}
                      </span>
                      <span className="shrink-0 text-xs text-ink-400">
                        {tamanhoLegivel(a.tamanho)}
                      </span>
                      <button
                        type="button"
                        title="Abrir"
                        onClick={() =>
                          anexosApi
                            .abrir(dono, donoId, a.id)
                            .catch(() => setErro('Não foi possível abrir o arquivo.'))
                        }
                        className="focus-ring rounded-lg p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Remover"
                        onClick={() => excluir(a.id)}
                        className="focus-ring rounded-lg p-1 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })
      )}

      <p className="text-xs text-ink-400">
        PDF ou imagem (JPG, PNG), até 5 MB cada. Recibo e comprovante chegam quase sempre como foto
        do celular — por isso a imagem é aceita.
      </p>
    </div>
  );
}
