import { useEffect, useRef, useState } from 'react';
import { Loader2, Send, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { obterToken } from '@/lib/authStorage';
import { http } from '@/services/http';

interface Mensagem {
  papel: 'usuario' | 'assistente';
  texto: string;
}

const SUGESTOES = [
  'O que preciso enviar na prestação de contas?',
  'Onde cadastro um termo aditivo?',
  'Qual o prazo da declaração negativa?',
];

/** Markdown mínimo — negrito, código, títulos e listas. É o que o assistente usa. */
function renderizar(texto: string) {
  return texto.split('\n').map((linha, i) => {
    const cabecalho = /^#{1,4}\s+(.*)$/.exec(linha);
    const item = /^\s*([-*]|\d+\.)\s+(.*)$/.exec(linha);
    const conteudo = cabecalho?.[1] ?? item?.[2] ?? linha;

    const pedacos = conteudo
      .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
      .filter(Boolean)
      .map((p, j) => {
        if (p.startsWith('**')) return <strong key={j}>{p.slice(2, -2)}</strong>;
        if (p.startsWith('`'))
          return (
            <code key={j} className="rounded bg-ink-100 px-1 py-0.5 font-mono text-[0.85em] dark:bg-ink-800">
              {p.slice(1, -1)}
            </code>
          );
        return <span key={j}>{p}</span>;
      });

    if (cabecalho) return <p key={i} className="mt-2 font-semibold">{pedacos}</p>;
    if (item)
      return (
        <p key={i} className="flex gap-1.5 pl-1">
          <span className="text-ink-400">{item[1]}</span>
          <span>{pedacos}</span>
        </p>
      );
    if (!linha.trim()) return <span key={i} className="block h-2" />;
    return <p key={i}>{pedacos}</p>;
  });
}

/**
 * Assistente da Fase V — painel de conversa aberto pelo ícone da barra superior.
 *
 * A resposta chega em streaming (SSE) porque o modelo lê a documentação inteira
 * antes de responder: sem o texto aparecendo aos poucos, a espera pareceria
 * travamento.
 */
export function Assistente({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [pergunta, setPergunta] = useState('');
  const [respondendo, setRespondendo] = useState(false);
  const fim = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (aberto) campo.current?.focus();
  }, [aberto]);

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens, respondendo]);

  async function perguntar(texto: string) {
    const limpo = texto.trim();
    if (!limpo || respondendo) return;

    const historico: Mensagem[] = [...mensagens, { papel: 'usuario', texto: limpo }];
    setMensagens([...historico, { papel: 'assistente', texto: '' }]);
    setPergunta('');
    setRespondendo(true);

    /** Escreve no último balão, que é o do assistente em construção. */
    const acrescentar = (trecho: string) =>
      setMensagens((atual) => {
        const copia = [...atual];
        copia[copia.length - 1] = {
          papel: 'assistente',
          texto: copia[copia.length - 1].texto + trecho,
        };
        return copia;
      });

    try {
      // `fetch` em vez do axios: a instância padrão só entrega a resposta
      // inteira, e aqui é preciso ler o corpo enquanto ele chega. O token vem
      // da mesma origem que o interceptor usa — ele o injeta por requisição,
      // não em `defaults`, então não há o que reaproveitar da instância.
      const resposta = await fetch(`${http.defaults.baseURL}/assistente`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${obterToken() ?? ''}`,
        },
        body: JSON.stringify({ mensagens: historico }),
      });

      if (!resposta.ok || !resposta.body) throw new Error('Falha ao falar com o assistente.');

      const leitor = resposta.body.getReader();
      const decodificador = new TextDecoder();
      let restante = '';

      for (;;) {
        const { done, value } = await leitor.read();
        if (done) break;
        restante += decodificador.decode(value, { stream: true });

        // Um evento SSE termina em linha em branco; o que sobrar fica para o
        // próximo pedaço — um evento pode ser partido no meio pela rede.
        const eventos = restante.split('\n\n');
        restante = eventos.pop() ?? '';

        for (const evento of eventos) {
          const tipo = /^event:\s*(.+)$/m.exec(evento)?.[1];
          const dados = /^data:\s*(.*)$/m.exec(evento)?.[1];
          if (!tipo || dados === undefined) continue;
          if (tipo === 'trecho') acrescentar(JSON.parse(dados) as string);
          else if (tipo === 'erro') acrescentar(`\n\n_${JSON.parse(dados) as string}_`);
        }
      }
    } catch {
      acrescentar('\n\n_Não consegui responder agora. Tente novamente._');
    } finally {
      setRespondendo(false);
    }
  }

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-40 sm:inset-auto sm:bottom-4 sm:right-4 sm:top-20">
      <div
        className="absolute inset-0 bg-ink-950/30 backdrop-blur-sm sm:hidden"
        onClick={onFechar}
        aria-hidden
      />
      <div
        role="dialog"
        aria-label="Assistente da Fase V"
        className="absolute inset-x-0 bottom-0 top-16 flex flex-col overflow-hidden rounded-t-2xl border border-ink-200 bg-white shadow-pop dark:border-ink-800 dark:bg-ink-900 sm:static sm:h-[min(36rem,calc(100vh-7rem))] sm:w-[26rem] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-2 border-b border-ink-100 px-4 py-3 dark:border-ink-800">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-500" />
            <span className="text-sm font-semibold text-ink-800 dark:text-ink-100">
              Assistente da Fase V
            </span>
          </div>
          <button
            onClick={onFechar}
            aria-label="Fechar assistente"
            className="focus-ring rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {mensagens.length === 0 && (
            <div className="pt-2">
              <p className="text-sm text-ink-500 dark:text-ink-400">
                Pergunte sobre o Audesp Fase V e sobre como usar o sistema. Respondo a partir dos
                manuais do TCESP e da documentação do próprio sistema, e digo quando não encontro a
                informação neles.
              </p>
              <div className="mt-3 space-y-1.5">
                {SUGESTOES.map((s) => (
                  <button
                    key={s}
                    onClick={() => perguntar(s)}
                    className="focus-ring block w-full rounded-lg border border-ink-200 px-3 py-2 text-left text-sm text-ink-600 transition-colors hover:border-brand-500 hover:text-ink-800 dark:border-ink-800 dark:text-ink-300 dark:hover:text-ink-100"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mensagens.map((m, i) => (
            <div
              key={i}
              className={cn(
                'max-w-[92%] rounded-2xl px-3 py-2 text-sm',
                m.papel === 'usuario'
                  ? 'ml-auto bg-brand-600 text-white'
                  : 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200',
              )}
            >
              {m.texto ? (
                <div className="space-y-0.5 [overflow-wrap:anywhere]">{renderizar(m.texto)}</div>
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-ink-400" />
              )}
            </div>
          ))}
          <div ref={fim} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            perguntar(pergunta);
          }}
          className="flex items-end gap-2 border-t border-ink-100 p-3 dark:border-ink-800"
        >
          <textarea
            ref={campo}
            rows={2}
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
            onKeyDown={(e) => {
              // Enter envia; Shift+Enter quebra linha.
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                perguntar(pergunta);
              }
            }}
            placeholder="Sua dúvida sobre a Fase V ou o sistema..."
            className="focus-ring max-h-32 flex-1 resize-none rounded-xl border border-ink-200 bg-ink-50 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-100"
          />
          <button
            type="submit"
            disabled={respondendo || !pergunta.trim()}
            aria-label="Enviar"
            className="focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
          >
            {respondendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
