import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Printer, ShieldAlert, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { http, extrairMensagemErro } from '@/services/http';
import {
  BLOCO_LABEL,
  formatar,
  formatarMoedaEspelho,
  humanizar,
  totalMonetario,
} from '@/lib/espelho';
import { STATUS_PRESTACAO_LABEL, STATUS_PRESTACAO_TONE, type Prestacao } from '@/types/prestacao';

interface Montagem {
  documento: Record<string, unknown>;
  avisos: string[];
  erros: string[];
}

/**
 * Espelho da Prestação de Contas — o documento inteiro numa página, para
 * conferência antes de transmitir e para arquivo impresso.
 *
 * Renderiza o mesmo `documentoJSON` que vai ao TCESP, e não uma consulta
 * própria ao banco. Se o espelho montasse os números por conta própria, ele
 * poderia mostrar um total e o Tribunal receber outro — e a conferência
 * passaria a esconder exatamente o erro que deveria revelar.
 */
export function Espelho() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [prestacao, setPrestacao] = useState<Prestacao | null>(null);
  const [montagem, setMontagem] = useState<Montagem | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    Promise.all([
      http.get<Prestacao>(`/prestacoes/${id}`).then((r) => r.data),
      http.get<Montagem>(`/prestacoes/${id}/json`).then((r) => r.data),
    ])
      .then(([p, m]) => {
        if (!vivo) return;
        setPrestacao(p);
        setMontagem(m);
      })
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Não foi possível montar o espelho.')))
      .finally(() => undefined);
    return () => {
      vivo = false;
    };
  }, [id]);

  if (erro)
    return (
      <p className="rounded-2xl border border-ink-200/70 bg-white p-6 text-sm font-medium text-red-500 dark:border-ink-800/70 dark:bg-ink-900">
        {erro}
      </p>
    );

  if (!prestacao || !montagem)
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
      </div>
    );

  const { documento, erros, avisos } = montagem;
  const blocos = Object.entries(documento);

  return (
    <div className="mx-auto max-w-5xl">
      {/* A barra some na impressão: o papel não tem botão. */}
      <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
        <Button variant="secondary" onClick={() => navigate(`/prestacao-contas/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Imprimir / PDF
        </Button>
      </div>

      <article className="rounded-2xl border border-ink-200/70 bg-white p-6 shadow-card dark:border-ink-800/70 dark:bg-ink-900 print:border-0 print:shadow-none">
        <header className="border-b border-ink-200 pb-4 dark:border-ink-800">
          <p className="text-xs uppercase tracking-wider text-ink-400">
            Audesp Fase V · Prestação de contas dos repasses ao Terceiro Setor
          </p>
          <h1 className="mt-1 text-xl font-semibold text-ink-900 dark:text-ink-50">
            {prestacao.ajusteCodigo} — exercício {prestacao.ano}
          </h1>
          <p className="mt-0.5 text-sm text-ink-600 dark:text-ink-300">{prestacao.entidadeNome}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <Badge tone={STATUS_PRESTACAO_TONE[prestacao.status]}>
              {STATUS_PRESTACAO_LABEL[prestacao.status]}
            </Badge>
            {prestacao.ehRetificacao && <Badge tone="warning">Retificação</Badge>}
            {prestacao.protocolo && (
              <span className="text-ink-500 dark:text-ink-400">
                Protocolo <span className="font-mono">{prestacao.protocolo}</span>
              </span>
            )}
            {prestacao.dataEnvio && (
              <span className="text-ink-500 dark:text-ink-400">
                Transmitida em {new Date(prestacao.dataEnvio).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
        </header>

        {/* Pendências primeiro: quem abre o espelho antes de transmitir precisa
            saber o que barra o envio antes de ler 29 blocos. */}
        {(erros.length > 0 || avisos.length > 0) && (
          <section className="mt-4 space-y-3">
            {erros.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50/60 p-3 dark:border-red-500/30 dark:bg-red-500/10">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-red-600 dark:text-red-400">
                  <ShieldAlert className="h-4 w-4" />
                  {erros.length} impedimento(s) — precisam ser corrigidos antes de transmitir
                </p>
                <ul className="mt-1.5 space-y-1">
                  {erros.map((e) => (
                    <li key={e} className="text-xs text-red-700 dark:text-red-300">
                      • {e}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {avisos.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-400">
                  <TriangleAlert className="h-4 w-4" />
                  {avisos.length} aviso(s)
                </p>
                <ul className="mt-1.5 space-y-1">
                  {avisos.map((a) => (
                    <li key={a} className="text-xs text-amber-800 dark:text-amber-300">
                      • {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {blocos.map(([chave, valor]) => (
          <Bloco key={chave} chave={chave} valor={valor} />
        ))}

        <footer className="mt-6 border-t border-ink-200 pt-3 text-[11px] text-ink-400 dark:border-ink-800">
          Espelho gerado em {new Date().toLocaleString('pt-BR')} a partir do mesmo documento que é
          transmitido ao TCESP. Documento de conferência interna — não substitui o protocolo do
          Tribunal.
        </footer>
      </article>
    </div>
  );
}

/** Um bloco do documento: lista vira tabela, objeto vira lista de campos. */
function Bloco({ chave, valor }: { chave: string; valor: unknown }) {
  const titulo = BLOCO_LABEL[chave] ?? humanizar(chave);

  if (valor === null || valor === undefined) return null;

  // Campo solto no topo do documento (código do ajuste, retificação).
  if (typeof valor !== 'object')
    return (
      <Secao titulo={titulo}>
        <p className="text-sm text-ink-800 dark:text-ink-100">{formatar(chave, valor)}</p>
      </Secao>
    );

  if (Array.isArray(valor)) {
    const linhas = valor as Record<string, unknown>[];
    if (linhas.length === 0)
      return (
        <Secao titulo={titulo} contagem={0}>
          <p className="text-sm text-ink-400">Nenhum registro.</p>
        </Secao>
      );

    const colunas = [...new Set(linhas.flatMap((l) => Object.keys(l)))];
    const total = totalMonetario(linhas);

    return (
      <Secao titulo={titulo} contagem={linhas.length}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-ink-200 text-[11px] uppercase tracking-wider text-ink-400 dark:border-ink-800">
                {colunas.map((c) => (
                  <th key={c} className="px-2 py-1.5 font-medium">
                    {humanizar(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
              {linhas.map((linha, i) => (
                <tr key={i}>
                  {colunas.map((c) => (
                    <td key={c} className="px-2 py-1.5 text-ink-700 dark:text-ink-200">
                      {formatar(c, linha[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {total && (
              <tfoot>
                <tr className="border-t border-ink-200 dark:border-ink-800">
                  <td
                    colSpan={colunas.length}
                    className="px-2 py-1.5 text-right font-semibold text-ink-800 dark:text-ink-100"
                  >
                    Total de {humanizar(total.campo).toLowerCase()}:{' '}
                    {formatarMoedaEspelho(total.total)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Secao>
    );
  }

  const campos = Object.entries(valor as Record<string, unknown>);
  return (
    <Secao titulo={titulo}>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
        {campos.map(([c, v]) => (
          <div key={c} className="min-w-0">
            <dt className="truncate text-[11px] uppercase tracking-wider text-ink-400">
              {humanizar(c)}
            </dt>
            <dd className="truncate text-sm text-ink-800 dark:text-ink-100">{formatar(c, v)}</dd>
          </div>
        ))}
      </dl>
    </Secao>
  );
}

function Secao({
  titulo,
  contagem,
  children,
}: {
  titulo: string;
  contagem?: number;
  children: React.ReactNode;
}) {
  return (
    // `break-inside-avoid` mantém o bloco inteiro na mesma folha sempre que
    // couber — tabela partida ao meio é o que torna relatório impresso ilegível.
    <section className="mt-5 print:break-inside-avoid">
      <h2 className="mb-1.5 flex items-center gap-2 border-b border-ink-100 pb-1 text-sm font-semibold text-ink-800 dark:border-ink-800 dark:text-ink-100">
        {titulo}
        {contagem !== undefined && (
          <span className="text-xs font-normal text-ink-400">({contagem})</span>
        )}
      </h2>
      {children}
    </section>
  );
}
