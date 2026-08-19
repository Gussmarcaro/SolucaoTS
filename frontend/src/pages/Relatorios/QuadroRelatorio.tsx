import { type ReactNode } from 'react';
import { Download, Loader2, Printer, ServerCrash } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

export interface ColunaRel<T> {
  chave: string;
  rotulo: string;
  alinhar?: 'left' | 'right' | 'center';
  /** O que aparece na tela. */
  celula: (linha: T) => ReactNode;
  /** O que vai para o CSV — texto puro. Ausente = a coluna fica fora do CSV. */
  texto?: (linha: T) => string;
  /** Rodapé da coluna (total, contagem…). */
  rodape?: (linhas: T[]) => ReactNode;
}

interface Props<T> {
  titulo: string;
  colunas: ColunaRel<T>[];
  linhas: T[] | null;
  erro?: string | null;
  vazio?: string;
  /** Nome base do arquivo exportado, sem extensão. */
  arquivo: string;
  /** Destaque opcional por linha (atraso, pendência…). */
  classeLinha?: (linha: T) => string | undefined;
  /** Conteúdo extra acima da tabela — filtros, avisos. */
  children?: ReactNode;
}

/**
 * Molde dos relatórios: tabela com rodapé de totais, export em CSV e impressão.
 *
 * Existe para que um relatório novo custe uma lista de colunas, e não uma tela
 * inteira — foi o que os dois moldes anteriores (Espelho e o relatório da
 * Transparência) mostraram valer a pena. Cada coluna diz como se desenha e
 * como se exporta; o resto é igual em todos.
 */
export function QuadroRelatorio<T>({
  titulo,
  colunas,
  linhas,
  erro,
  vazio = 'Nada a exibir com estes filtros.',
  arquivo,
  classeLinha,
  children,
}: Props<T>) {
  function exportar() {
    if (!linhas?.length) return;
    const doCsv = colunas.filter((c) => c.texto);
    const conteudo = [
      doCsv.map((c) => c.rotulo),
      ...linhas.map((l) => doCsv.map((c) => c.texto!(l))),
    ]
      .map((linha) => linha.map((celula) => `"${String(celula).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');

    // `;` e BOM: é o que o Excel em português abre sem pedir importação.
    const blob = new Blob([`﻿${conteudo}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${arquivo}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const temRodape = colunas.some((c) => c.rodape);

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-card dark:border-ink-800/70 dark:bg-ink-900">
      <div className="flex flex-col gap-3 border-b border-ink-100 p-4 dark:border-ink-800 sm:flex-row sm:items-end sm:justify-between print:hidden">
        <div className="flex flex-1 flex-wrap items-end gap-3">{children}</div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="secondary" size="sm" onClick={exportar} disabled={!linhas?.length}>
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => window.print()} disabled={!linhas?.length}>
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Só aparece no papel: a impressão perde o cabeçalho da aplicação. */}
      <p className="hidden px-4 pt-2 text-sm font-semibold print:block">{titulo}</p>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50 text-[11px] uppercase tracking-wide text-ink-500 dark:border-ink-800 dark:bg-ink-800/40 dark:text-ink-400">
              {colunas.map((c) => (
                <th
                  key={c.chave}
                  className={cn(
                    'whitespace-nowrap px-3 py-2 font-semibold',
                    c.alinhar === 'right' && 'text-right',
                    c.alinhar === 'center' && 'text-center',
                  )}
                >
                  {c.rotulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
            {linhas === null && !erro && (
              <tr>
                <td colSpan={colunas.length} className="py-16 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-500" />
                </td>
              </tr>
            )}

            {erro && (
              <tr>
                <td colSpan={colunas.length} className="py-16 text-center">
                  <ServerCrash className="mx-auto h-8 w-8 text-red-400" />
                  <p className="mt-2 text-sm font-medium text-ink-600 dark:text-ink-300">{erro}</p>
                </td>
              </tr>
            )}

            {linhas?.length === 0 && (
              <tr>
                <td colSpan={colunas.length} className="py-16 text-center text-sm text-ink-400">
                  {vazio}
                </td>
              </tr>
            )}

            {linhas?.map((l, i) => (
              <tr
                key={i}
                className={cn(
                  'transition-colors hover:bg-ink-50/70 dark:hover:bg-ink-800/40 print:break-inside-avoid',
                  classeLinha?.(l),
                )}
              >
                {colunas.map((c) => (
                  <td
                    key={c.chave}
                    className={cn(
                      'px-3 py-2 align-top',
                      c.alinhar === 'right' && 'whitespace-nowrap text-right tabular-nums',
                      c.alinhar === 'center' && 'text-center',
                    )}
                  >
                    {c.celula(l)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>

          {temRodape && !!linhas?.length && (
            <tfoot>
              <tr className="border-t-2 border-ink-300 bg-ink-50 font-semibold dark:border-ink-700 dark:bg-ink-800/40">
                {colunas.map((c) => (
                  <td
                    key={c.chave}
                    className={cn(
                      'px-3 py-2',
                      c.alinhar === 'right' && 'whitespace-nowrap text-right tabular-nums',
                      c.alinhar === 'center' && 'text-center',
                    )}
                  >
                    {c.rodape?.(linhas)}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
