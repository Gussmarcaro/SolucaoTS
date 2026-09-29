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

/** Espelha `TAMANHO_MAXIMO_ANEXO` do backend. */
const TAMANHO_MAXIMO = 5 * 1024 * 1024;

/**
 * Um arquivo escolhido **antes** de o lançamento existir.
 *
 * Fica só na memória da tela até a gravação — não há onde guardá-lo no
 * servidor sem o dono, e inventar um rascunho no banco criaria registro órfão
 * toda vez que alguém desistisse do formulário.
 */
export interface AnexoPendente {
  /** Chave local, para a lista e a remoção. O arquivo não tem id ainda. */
  id: string;
  tipo: TipoAnexo;
  arquivo: File;
}

/**
 * Sobe os arquivos que ficaram esperando, agora que o lançamento existe.
 *
 * Devolve o que **falhou**, em vez de lançar: o lançamento já foi gravado, e
 * uma exceção aqui faria a tela parecer que nada foi salvo. O chamador precisa
 * poder dizer "salvei, mas o comprovante não subiu" — que é a verdade.
 */
export async function enviarPendentes(
  dono: DonoAnexo,
  donoId: string,
  pendentes: AnexoPendente[],
): Promise<{ enviados: AnexoPendente[]; falhas: { pendente: AnexoPendente; motivo: string }[] }> {
  const enviados: AnexoPendente[] = [];
  const falhas: { pendente: AnexoPendente; motivo: string }[] = [];

  // Em série, e não em paralelo: são poucos arquivos, e o servidor tem limite
  // de taxa. Um lote paralelo de dez anexos é justamente o tipo de rajada que
  // o teto de 300/min existe para conter.
  for (const p of pendentes) {
    try {
      await anexosApi.enviar(dono, donoId, p.tipo, p.arquivo);
      enviados.push(p);
    } catch (e) {
      falhas.push({ pendente: p, motivo: extrairMensagemErro(e, 'falha no envio') });
    }
  }
  return { enviados, falhas };
}

/**
 * Os arquivos de um lançamento, agrupados por papel.
 *
 * A fiscalização não pergunta "quanto foi pago" — o sistema já responde isso.
 * Ela pergunta **"cadê o documento"**, e até aqui a resposta morava numa pasta
 * de rede. Guardar o arquivo junto do lançamento é o que torna a prestação
 * conferível sem sair do sistema.
 *
 * **O envio precisa do id do lançamento**, que num cadastro novo só existe
 * depois da gravação. Até aqui isso virava uma frase pedindo que a pessoa
 * salvasse e voltasse — o que na prática empurra o comprovante para "depois",
 * e "depois" é quando a fiscalização pergunta e ninguém acha o arquivo.
 *
 * Por isso o formulário pode **escolher o arquivo antes**: passando
 * `onPendentes`, o componente guarda a seleção na memória da tela e o
 * formulário a envia com `enviarPendentes` assim que o registro nasce. Quem
 * não passa continua vendo a frase — mudar o comportamento de quem não pediu
 * faria o arquivo ser escolhido e descartado em silêncio, que é pior que não
 * poder escolher.
 *
 * Cada papel aceita **mais de um arquivo**: "documento auxiliar" costuma ser o
 * laudo *e* o parecer, e forçar um só faria o segundo virar anexo de e-mail.
 */
export function Anexos({
  dono,
  donoId,
  tipos,
  pendentes,
  onPendentes,
}: {
  dono: DonoAnexo;
  /** Ausente enquanto o lançamento não foi criado. */
  donoId?: string;
  /** Os papéis que este lançamento aceita, na ordem em que aparecem. */
  tipos: TipoAnexo[];
  /** Arquivos escolhidos antes de existir o registro. Só com `onPendentes`. */
  pendentes?: AnexoPendente[];
  /**
   * Habilita a escolha antecipada. Quem passa isto **precisa** chamar
   * `enviarPendentes` depois de criar o registro — senão o arquivo escolhido
   * simplesmente some.
   */
  onPendentes?: (p: AnexoPendente[]) => void;
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

  /**
   * Confere o arquivo **antes** de aceitá-lo na fila.
   *
   * No modo normal quem recusa é o servidor, e a resposta chega em segundos.
   * Aqui não há servidor no caminho: sem esta conferência, o arquivo de 40 MB
   * só seria recusado no momento da gravação — depois de o lançamento já ter
   * sido criado, que é o pior instante possível para descobrir.
   */
  function recusar(f: File): string | null {
    if (f.size > TAMANHO_MAXIMO)
      return `“${f.name}” tem ${tamanhoLegivel(f.size)} — o limite é 5 MB.`;
    if (!/^(application\/pdf|image\/)/.test(f.type))
      return `“${f.name}” não é PDF nem imagem.`;
    return null;
  }

  if (!donoId) {
    // Sem o gancho do formulário, o arquivo escolhido não teria para onde ir.
    if (!onPendentes)
      return (
        <p className="text-xs text-ink-400">
          Os arquivos podem ser anexados depois de <strong>salvar</strong> o lançamento — o envio
          precisa do registro já criado.
        </p>
      );

    const fila = pendentes ?? [];

    return (
      <div className="space-y-3">
        {erro && <p className="text-xs font-medium text-red-500">{erro}</p>}

        {tipos.map((tipo) => {
          const arquivos = fila.filter((p) => p.tipo === tipo);
          return (
            <div key={tipo}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-ink-700 dark:text-ink-300">
                  {TIPO_ANEXO_LABEL[tipo]}
                </span>
                <label className="focus-ring inline-flex cursor-pointer items-center gap-1.5 rounded text-xs text-brand-600 hover:underline dark:text-brand-400">
                  <Upload className="h-3.5 w-3.5" />
                  escolher
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      const escolhidos = Array.from(e.target.files ?? []);
                      // Limpa o input: sem isso, escolher o mesmo arquivo duas
                      // vezes seguidas não dispara o evento na segunda.
                      e.target.value = '';
                      const problema = escolhidos.map(recusar).find(Boolean);
                      setErro(problema ?? null);
                      const aceitos = escolhidos.filter((f) => !recusar(f));
                      if (aceitos.length)
                        onPendentes([
                          ...fila,
                          ...aceitos.map((arquivo) => ({
                            id: `${Date.now()}-${arquivo.name}-${Math.random()}`,
                            tipo,
                            arquivo,
                          })),
                        ]);
                    }}
                  />
                </label>
              </div>

              {arquivos.length === 0 ? (
                <p className="text-xs text-ink-400">Nenhum arquivo.</p>
              ) : (
                <ul className="space-y-1">
                  {arquivos.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-2 rounded-lg border border-dashed border-ink-300 bg-ink-50/60 px-3 py-1.5 text-sm dark:border-ink-600 dark:bg-ink-800/40"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-ink-400" />
                      <span
                        className="min-w-0 flex-1 truncate text-ink-700 dark:text-ink-200"
                        title={p.arquivo.name}
                      >
                        {p.arquivo.name}
                      </span>
                      <span className="shrink-0 text-xs text-ink-400">
                        {tamanhoLegivel(p.arquivo.size)}
                      </span>
                      <button
                        type="button"
                        title="Remover"
                        onClick={() => onPendentes(fila.filter((x) => x.id !== p.id))}
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
        })}

        {/* A borda tracejada e este aviso são o que distingue "escolhido" de
            "guardado": enquanto o lançamento não for salvo, o arquivo está só
            nesta aba, e fechar a janela o descarta. */}
        <p className="text-xs text-ink-400">
          {fila.length > 0 ? (
            <>
              <strong className="text-ink-500 dark:text-ink-300">
                {fila.length} arquivo(s) serão enviados ao salvar.
              </strong>{' '}
              Fechar sem salvar descarta a escolha.
            </>
          ) : (
            'PDF ou imagem (JPG, PNG), até 5 MB cada. O envio acontece ao salvar o lançamento.'
          )}
        </p>
      </div>
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
