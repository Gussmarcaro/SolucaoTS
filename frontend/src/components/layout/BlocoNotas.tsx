import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Loader2, NotebookPen, Plus, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { extrairMensagemErro } from '@/services/http';
import { criarNota, excluirNota, listarNotas, salvarNota, type NotaRapida } from '@/services/notas.service';

/** Pausa na digitação antes de gravar — o bastante para não gravar a cada tecla. */
const ESPERA_MS = 700;
const LIMITE = 10_000;

/** A primeira linha não vazia vira o título; nota em branco é "Nova nota". */
const tituloDe = (texto: string) => texto.split('\n').find((l) => l.trim())?.trim() || 'Nova nota';

function quando(iso: string): string {
  const d = new Date(iso);
  const hoje = new Date();
  const mesmoDia = d.toDateString() === hoje.toDateString();
  return mesmoDia
    ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

type Estado = 'parado' | 'salvando' | 'salvo' | 'erro';

/**
 * Bloco de notas rápidas — anotações da própria pessoa, abertas pela barra
 * superior sem sair da tela em que se está.
 *
 * **Salva sozinho**, numa pausa da digitação, e ao fechar o painel ou trocar de
 * nota. Botão de salvar num bloco de rascunho é o convite para perder o que se
 * anotou com pressa.
 *
 * **Só a pessoa vê.** A nota é guardada no servidor, presa ao usuário do login:
 * acompanha a pessoa em qualquer computador e em qualquer órgão que ela
 * atenda, e não aparece para administrador, suporte nem na auditoria.
 */
export function BlocoNotas({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const [notas, setNotas] = useState<NotaRapida[] | null>(null);
  const [atual, setAtual] = useState<NotaRapida | null>(null);
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState<Estado>('parado');
  const [erro, setErro] = useState<string | null>(null);
  const [confirmarApagar, setConfirmarApagar] = useState(false);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendente = useRef<{ id: string; texto: string } | null>(null);
  const campo = useRef<HTMLTextAreaElement>(null);

  // Carrega ao abrir — e não antes: quem nunca abre o bloco não paga a consulta.
  useEffect(() => {
    if (!aberto) return;
    let vivo = true;
    setErro(null);
    listarNotas()
      .then((n) => vivo && setNotas(n))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Não foi possível abrir as notas.')));
    return () => {
      vivo = false;
    };
  }, [aberto]);

  // Esc fecha; e fechar grava o que estiver pendente. Pela referência, para o
  // atalho sempre enxergar a nota aberta agora, e não a de quando abriu.
  const fecharAgora = useRef<() => void>(() => undefined);
  useEffect(() => {
    if (!aberto) return;
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && fecharAgora.current();
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [aberto]);

  useEffect(() => {
    if (atual) campo.current?.focus();
  }, [atual?.id]);

  /** Grava agora o que estiver esperando a pausa. */
  async function gravarPendente() {
    if (espera.current) clearTimeout(espera.current);
    espera.current = null;
    const p = pendente.current;
    if (!p) return;
    pendente.current = null;
    setEstado('salvando');
    try {
      const salva = await salvarNota(p.id, p.texto);
      setNotas((lista) => [salva, ...(lista ?? []).filter((n) => n.id !== salva.id)]);
      setEstado('salvo');
    } catch (e) {
      setEstado('erro');
      setErro(extrairMensagemErro(e, 'Não foi possível salvar a nota.'));
      // Devolve à fila: a próxima pausa tenta de novo, em vez de perder o texto.
      pendente.current = p;
    }
  }

  function digitar(valor: string) {
    if (!atual) return;
    setTexto(valor);
    setErro(null);
    pendente.current = { id: atual.id, texto: valor };
    setEstado('parado');
    if (espera.current) clearTimeout(espera.current);
    espera.current = setTimeout(gravarPendente, ESPERA_MS);
  }

  async function abrirNota(n: NotaRapida) {
    await gravarPendente();
    setConfirmarApagar(false);
    setAtual(n);
    setTexto(n.texto);
    setEstado('parado');
  }

  async function nova() {
    await gravarPendente();
    setErro(null);
    try {
      const n = await criarNota('');
      setNotas((lista) => [n, ...(lista ?? [])]);
      setAtual(n);
      setTexto('');
      setEstado('parado');
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível criar a nota.'));
    }
  }

  async function voltar() {
    await gravarPendente();
    // Nota que ficou em branco não vale um item na lista: some ao sair dela.
    if (atual && !texto.trim()) {
      await excluirNota(atual.id).catch(() => undefined);
      setNotas((lista) => (lista ?? []).filter((n) => n.id !== atual.id));
    }
    setAtual(null);
    setConfirmarApagar(false);
  }

  async function apagar() {
    if (!atual) return;
    pendente.current = null;
    if (espera.current) clearTimeout(espera.current);
    try {
      await excluirNota(atual.id);
      setNotas((lista) => (lista ?? []).filter((n) => n.id !== atual.id));
      setAtual(null);
      setConfirmarApagar(false);
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível apagar a nota.'));
    }
  }

  async function fechar() {
    await voltar();
    onFechar();
  }

  fecharAgora.current = fechar;

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-40 sm:inset-auto sm:bottom-4 sm:right-4 sm:top-20">
      <div className="absolute inset-0 bg-ink-950/30 backdrop-blur-sm sm:hidden" onClick={fechar} aria-hidden />
      <div
        role="dialog"
        aria-label="Bloco de notas"
        className="absolute inset-x-0 bottom-0 top-16 flex flex-col overflow-hidden rounded-t-2xl border border-ink-200 bg-white shadow-pop dark:border-ink-800 dark:bg-ink-900 sm:static sm:h-[min(32rem,calc(100vh-7rem))] sm:w-[24rem] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-2 border-b border-ink-100 px-3 py-2.5 dark:border-ink-800">
          <div className="flex min-w-0 items-center gap-2">
            {atual ? (
              <button
                onClick={voltar}
                aria-label="Voltar à lista de notas"
                className="focus-ring rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-100"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : (
              <NotebookPen className="ml-1 h-4 w-4 text-brand-500" />
            )}
            <span className="truncate text-sm font-semibold text-ink-800 dark:text-ink-100">
              {atual ? tituloDe(texto) : 'Bloco de notas'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {!atual && (
              <button
                onClick={nova}
                className="focus-ring inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
              >
                <Plus className="h-3.5 w-3.5" />
                Nova
              </button>
            )}
            {atual &&
              (confirmarApagar ? (
                <span className="flex items-center gap-1 text-xs">
                  <span className="text-ink-500 dark:text-ink-400">Apagar?</span>
                  <button onClick={apagar} className="focus-ring rounded-md px-1.5 py-0.5 font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10">
                    Sim
                  </button>
                  <button onClick={() => setConfirmarApagar(false)} className="focus-ring rounded-md px-1.5 py-0.5 text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800">
                    Não
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirmarApagar(true)}
                  aria-label="Apagar nota"
                  title="Apagar nota"
                  className="focus-ring rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ))}
            <button
              onClick={fechar}
              aria-label="Fechar bloco de notas"
              className="focus-ring rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {erro && (
          <p className="border-b border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {erro}
          </p>
        )}

        {atual ? (
          <>
            <textarea
              ref={campo}
              value={texto}
              onChange={(e) => digitar(e.target.value.slice(0, LIMITE))}
              placeholder="Anote o que precisar. A primeira linha vira o título."
              aria-label="Texto da nota"
              className="flex-1 resize-none bg-transparent px-4 py-3 text-sm leading-relaxed text-ink-800 outline-none placeholder:text-ink-400 dark:text-ink-100"
            />
            <div className="flex items-center justify-between border-t border-ink-100 px-4 py-1.5 text-[11px] text-ink-400 dark:border-ink-800">
              <span className="flex items-center gap-1">
                {estado === 'salvando' && (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" /> Salvando…
                  </>
                )}
                {estado === 'salvo' && (
                  <>
                    <Check className="h-3 w-3 text-emerald-500" /> Salvo
                  </>
                )}
                {estado === 'erro' && <span className="text-red-500">Não salvo — tentando de novo</span>}
              </span>
              <span>Só você vê esta nota</span>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {notas === null && !erro ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-ink-400" />
              </div>
            ) : notas && notas.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-sm text-ink-500 dark:text-ink-400">Nenhuma nota ainda.</p>
                <p className="mt-1 text-xs text-ink-400">
                  Um lugar para o que não pode ser esquecido: um telefone, um número de nota, um
                  "conferir amanhã". Só você vê.
                </p>
                <button
                  onClick={nova}
                  className="focus-ring mt-4 inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Primeira nota
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-ink-100 dark:divide-ink-800">
                {(notas ?? []).map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => abrirNota(n)}
                      className={cn(
                        'flex w-full flex-col gap-0.5 px-4 py-2.5 text-left transition-colors hover:bg-ink-50 dark:hover:bg-ink-800/60',
                      )}
                    >
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium text-ink-800 dark:text-ink-100">
                          {tituloDe(n.texto)}
                        </span>
                        <span className="shrink-0 text-[11px] text-ink-400">{quando(n.atualizadoEm)}</span>
                      </span>
                      <span className="line-clamp-2 text-xs text-ink-500 dark:text-ink-400">
                        {n.texto.split('\n').slice(1).join(' ').trim() || ' '}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
