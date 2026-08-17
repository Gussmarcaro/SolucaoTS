import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Download, ExternalLink, Loader2, Printer, TriangleAlert } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SeletorPagina } from '@/components/ui/SeletorPagina';
import { usePageSize } from '@/lib/paginacao';
import { formatarMoeda, dataBr } from '@/lib/masks';
import { http, extrairMensagemErro } from '@/services/http';
import { STATUS_PRESTACAO_LABEL, STATUS_PRESTACAO_TONE } from '@/types/prestacao';
import { TIPO_AJUSTE_LABEL } from '@/types/ajuste';
import type { Parceria } from './tipos';

/** Colunas do CSV — a mesma relação que vai ao portal do órgão. */
const CABECALHO = [
  'Data de assinatura',
  'Instrumento',
  'Tipo',
  'Organização da sociedade civil',
  'CNPJ',
  'Objeto',
  'Valor global',
  'Vigência',
  'Publicação',
  'Situação da prestação de contas',
];

/**
 * Painel de Transparência — a relação de parcerias que a Lei 13.019/2014
 * (art. 10) manda o órgão publicar, e o que ainda falta em cada uma.
 *
 * A tela **não publica nada**: reúne o conteúdo e aponta as pendências. A
 * publicação continua sendo ato do órgão no portal oficial, e sugerir que o
 * sistema já publicou daria uma sensação falsa de conformidade.
 */
export function Transparencia() {
  const [parcerias, setParcerias] = useState<Parceria[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [soPendentes, setSoPendentes] = useState(false);
  const [pageSize, setPageSize] = usePageSize('transparencia');

  useEffect(() => {
    let vivo = true;
    http
      .get<Parceria[]>('/transparencia')
      .then((r) => vivo && setParcerias(r.data))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Não foi possível carregar as parcerias.')))
      .finally(() => undefined);
    return () => {
      vivo = false;
    };
  }, []);

  const visiveis = useMemo(() => {
    const lista = parcerias ?? [];
    return (soPendentes ? lista.filter((p) => p.pendencias.length > 0) : lista).slice(0, pageSize);
  }, [parcerias, soPendentes, pageSize]);

  const comPendencia = (parcerias ?? []).filter((p) => p.pendencias.length > 0).length;

  function exportar() {
    const linhas = (parcerias ?? []).map((p) => [
      dataBr(p.dataAssinatura),
      p.numero ? `${p.codigoAjuste} (nº ${p.numero})` : p.codigoAjuste,
      TIPO_AJUSTE_LABEL[p.tipoAjuste as keyof typeof TIPO_AJUSTE_LABEL] ?? p.tipoAjuste,
      p.entidadeNome,
      p.entidadeCnpj,
      p.objeto,
      formatarMoeda(p.valorGlobal),
      p.vigenciaInicial && p.vigenciaFinal
        ? `${dataBr(p.vigenciaInicial)} a ${dataBr(p.vigenciaFinal)}`
        : '—',
      [p.publicacaoLocal, p.publicacaoData && dataBr(p.publicacaoData), p.publicacaoLink]
        .filter(Boolean)
        .join(' · ') || 'Não publicado',
      p.prestacaoStatus
        ? `${STATUS_PRESTACAO_LABEL[p.prestacaoStatus]}${p.prestacaoAno ? ` (${p.prestacaoAno})` : ''}`
        : 'Sem prestação registrada',
    ]);

    // Ponto e vírgula e BOM: é o que o Excel em português abre sem pedir
    // importação, e a planilha costuma ser a etapa seguinte da publicação.
    const csv = [CABECALHO, ...linhas]
      .map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');

    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transparencia-parcerias-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        title="Transparência"
        subtitle="Relação das parcerias para publicação no portal do órgão, conforme o art. 10 da Lei 13.019/2014."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={exportar} disabled={!parcerias?.length}>
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
            <Link to="/transparencia/relatorio">
              <Button disabled={!parcerias?.length}>
                <Printer className="h-4 w-4" />
                Relatório / PDF
              </Button>
            </Link>
          </div>
        }
      />

      {erro && <p className="text-sm font-medium text-red-500">{erro}</p>}

      {parcerias === null && !erro && (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
        </div>
      )}

      {parcerias && (
        <>
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-ink-200/70 bg-white p-4 shadow-card dark:border-ink-800/70 dark:bg-ink-900 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-sm">
              {comPendencia === 0 ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-ink-600 dark:text-ink-300">
                    As {parcerias.length} parceria(s) têm o conteúdo completo para publicação.
                  </span>
                </>
              ) : (
                <>
                  <TriangleAlert className="h-4 w-4 text-amber-500" />
                  <span className="text-ink-600 dark:text-ink-300">
                    <strong>{comPendencia}</strong> de {parcerias.length} parceria(s) com pendência
                    para publicar.
                  </span>
                </>
              )}
            </p>
            <label className="flex items-center gap-1.5 text-xs text-ink-500 dark:text-ink-400">
              <input
                type="checkbox"
                checked={soPendentes}
                onChange={(e) => setSoPendentes(e.target.checked)}
                className="rounded border-ink-300 dark:border-ink-700"
              />
              Mostrar só as pendentes
            </label>
          </div>

          <div className="space-y-3">
            {visiveis.map((p) => (
              <article
                key={p.ajusteId}
                className="rounded-2xl border border-ink-200/70 bg-white p-4 shadow-card dark:border-ink-800/70 dark:bg-ink-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      to={`/cadastro/ajustes/${p.ajusteId}`}
                      className="font-mono text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"
                    >
                      {p.codigoAjuste}
                      {p.numero ? ` · nº ${p.numero}` : ''}
                    </Link>
                    <p className="mt-0.5 text-sm text-ink-800 dark:text-ink-100">{p.entidadeNome}</p>
                    <p className="text-xs text-ink-400">
                      CNPJ {p.entidadeCnpj} ·{' '}
                      {TIPO_AJUSTE_LABEL[p.tipoAjuste as keyof typeof TIPO_AJUSTE_LABEL] ?? p.tipoAjuste}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">
                      {formatarMoeda(p.valorGlobal)}
                    </p>
                    <p className="text-xs text-ink-400">
                      Assinado em {dataBr(p.dataAssinatura)}
                    </p>
                  </div>
                </div>

                <p className="mt-2 line-clamp-2 text-xs text-ink-600 dark:text-ink-300">{p.objeto}</p>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  {p.prestacaoStatus ? (
                    <Badge tone={STATUS_PRESTACAO_TONE[p.prestacaoStatus]}>
                      {STATUS_PRESTACAO_LABEL[p.prestacaoStatus]}
                      {p.prestacaoAno ? ` · ${p.prestacaoAno}` : ''}
                    </Badge>
                  ) : (
                    <Badge tone="neutral">Sem prestação</Badge>
                  )}
                  {p.publicacaoLink && (
                    <a
                      href={p.publicacaoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-brand-600 hover:underline dark:text-brand-300"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Publicação
                    </a>
                  )}
                  {p.publicacaoData && (
                    <span className="text-ink-400">publicado em {dataBr(p.publicacaoData)}</span>
                  )}
                </div>

                {p.pendencias.length > 0 && (
                  <ul className="mt-2 space-y-0.5 border-t border-ink-100 pt-2 dark:border-ink-800">
                    {p.pendencias.map((d) => (
                      <li
                        key={d}
                        className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400"
                      >
                        <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
                        {d}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}

            {visiveis.length === 0 && (
              <p className="rounded-2xl border border-ink-200/70 bg-white py-12 text-center text-sm text-ink-400 dark:border-ink-800/70 dark:bg-ink-900">
                {soPendentes ? 'Nenhuma parceria com pendência.' : 'Nenhuma parceria cadastrada.'}
              </p>
            )}
          </div>

          <div className="mt-3 flex justify-end">
            <SeletorPagina valor={pageSize} onChange={setPageSize} total={parcerias.length} />
          </div>

          <p className="mt-4 text-xs text-ink-400">
            Esta tela reúne o conteúdo e aponta o que falta — a publicação continua sendo ato do
            órgão no portal oficial. O CSV abre direto no Excel em português.
          </p>
        </>
      )}
    </>
  );
}
