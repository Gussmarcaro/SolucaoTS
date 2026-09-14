import { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { conferirPrestacao } from '@/services/prestacoes.service';
import { extrairMensagemErro } from '@/services/http';
import { BLOCOS, type Pendencia, type ResultadoConferencia } from '@/types/prestacao';
import { cn } from '@/lib/cn';

const nomeDoBloco = (chave: string | null) =>
  chave ? (BLOCOS.find((b) => b.chave === chave)?.nome ?? chave) : null;

/**
 * "Esta prestação está pronta?"
 *
 * O Espelho já mostrava erros e avisos — mas só para quem o abre, e quem o
 * abre já decidiu transmitir. O erro caro não é o de quem confere; é o de quem
 * não sabia que havia o que conferir. Por isso a resposta vem para a própria
 * prestação, acima dos blocos.
 *
 * Três coisas, e a ordem importa:
 *
 * 1. **Pendências** primeiro — o que passa na validação e ainda assim está
 *    errado (prestação sem nota nenhuma é estruturalmente válida). É a
 *    informação que não existia em lugar nenhum.
 * 2. **Erros** — o que o Tribunal recusa.
 * 3. **Avisos** — por último, recolhidos.
 *
 * Cada pendência leva à aba onde se resolve. Um painel que aponta problema sem
 * dizer onde arrumá-lo transfere ao usuário o trabalho de procurar, que é
 * justamente o que ele veio evitar.
 *
 * **Carrega sob demanda, não ao abrir a tela.** A conferência monta o
 * documento inteiro no servidor; fazer isso a cada visita ao dossiê cobraria
 * de todo mundo o custo de uma pergunta que se faz poucas vezes.
 */
export function PainelConferencia({
  prestacaoId,
  onIrParaBloco,
}: {
  prestacaoId: string;
  onIrParaBloco: (bloco: string) => void;
}) {
  const [r, setR] = useState<ResultadoConferencia | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [avisosAbertos, setAvisosAbertos] = useState(false);

  // Trocar de prestação tem de apagar o resultado da anterior — um painel
  // dizendo "pronta" sobre outro documento é pior que painel nenhum.
  useEffect(() => {
    setR(null);
    setErro(null);
    setAvisosAbertos(false);
  }, [prestacaoId]);

  async function conferir() {
    setCarregando(true);
    setErro(null);
    try {
      setR(await conferirPrestacao(prestacaoId));
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível conferir a prestação.'));
    } finally {
      setCarregando(false);
    }
  }

  const impeditivas = r?.pendencias.filter((p) => p.severidade === 'IMPEDE') ?? [];
  const atencoes = r?.pendencias.filter((p) => p.severidade === 'ATENCAO') ?? [];

  return (
    <div className="mb-6 rounded-2xl border border-ink-200/70 bg-white p-5 shadow-card dark:border-ink-800/70 dark:bg-ink-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink-700 dark:text-ink-200">
            Esta prestação está pronta?
          </h2>
          <p className="mt-0.5 text-xs text-ink-400">
            Confere o que o Tribunal recusaria <strong>e</strong> o que passaria na validação
            estando errado — prestação sem nota nenhuma é um documento válido.
          </p>
        </div>
        <Button variant={r ? 'secondary' : 'primary'} size="sm" onClick={conferir} disabled={carregando}>
          {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {r ? 'Conferir de novo' : 'Conferir'}
        </Button>
      </div>

      {erro && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      {r && (
        <div className="mt-4 space-y-4">
          {/* --- o veredito --- */}
          {r.pronta ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <strong>Nada impede a transmissão.</strong> Nenhum erro de validação e nenhuma
                pendência de conteúdo.
                {atencoes.length > 0 && ' Há pontos de atenção abaixo — valem uma olhada, não travam o envio.'}
              </span>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <strong>Ainda não.</strong>{' '}
                {[
                  r.erros.length && `${r.erros.length} erro(s) de validação`,
                  impeditivas.length && `${impeditivas.length} pendência(s) de conteúdo`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                .
              </span>
            </div>
          )}

          {/* --- pendências: o que a validação não pega --- */}
          {(impeditivas.length > 0 || atencoes.length > 0) && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
                Conteúdo ({impeditivas.length + atencoes.length})
              </h3>
              <ul className="space-y-1.5">
                {[...impeditivas, ...atencoes].map((p, i) => (
                  <LinhaPendencia key={i} p={p} onIr={onIrParaBloco} />
                ))}
              </ul>
            </div>
          )}

          {/* --- erros: o que o Tribunal recusa --- */}
          {r.erros.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
                Erros de validação ({r.erros.length})
              </h3>
              <ul className="space-y-1">
                {r.erros.map((e, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 rounded-lg bg-red-50/70 px-3 py-2 text-[13px] text-red-800 dark:bg-red-500/10 dark:text-red-300"
                  >
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0">{e}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Avisos recolhidos: são muitos e raramente acionáveis; abertos por
              padrão empurrariam para baixo o que importa. */}
          {r.avisos.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setAvisosAbertos((v) => !v)}
                className="focus-ring flex items-center gap-1.5 rounded text-xs font-semibold uppercase tracking-wider text-ink-400 hover:text-ink-600 dark:hover:text-ink-200"
              >
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', avisosAbertos && 'rotate-180')} />
                Avisos ({r.avisos.length})
              </button>
              {avisosAbertos && (
                <ul className="mt-2 space-y-1">
                  {r.avisos.map((a, i) => (
                    <li key={i} className="rounded-lg bg-ink-50 px-3 py-2 text-[13px] text-ink-600 dark:bg-ink-800/50 dark:text-ink-300">
                      {a}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LinhaPendencia({ p, onIr }: { p: Pendencia; onIr: (bloco: string) => void }) {
  const impede = p.severidade === 'IMPEDE';
  const bloco = nomeDoBloco(p.bloco);

  const conteudo = (
    <>
      {impede ? (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
      ) : (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      )}
      <span className="min-w-0 flex-1">
        <span className="text-ink-700 dark:text-ink-200">{p.titulo}</span>
        {bloco && (
          <span className="ml-2 whitespace-nowrap text-xs text-brand-600 dark:text-brand-400">
            ir para {bloco} →
          </span>
        )}
      </span>
    </>
  );

  const classe = cn(
    'flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition-colors',
    impede ? 'bg-red-50/60 dark:bg-red-500/10' : 'bg-amber-50/60 dark:bg-amber-500/10',
  );

  // Pendência sem bloco (é do ajuste, não da prestação) não vira botão: não há
  // aba para onde levar, e um botão que não faz nada é pior que texto.
  return (
    <li>
      {p.bloco ? (
        <button type="button" onClick={() => onIr(p.bloco!)} className={cn(classe, 'focus-ring hover:brightness-95')}>
          {conteudo}
        </button>
      ) : (
        <div className={classe}>{conteudo}</div>
      )}
    </li>
  );
}
