import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { dataBr, formatarMoeda } from '@/lib/masks';
import { http, extrairMensagemErro } from '@/services/http';
import { STATUS_PRESTACAO_LABEL, type StatusPrestacao } from '@/types/prestacao';
import { TIPO_AJUSTE_LABEL } from '@/types/ajuste';
import type { Parceria } from './tipos';

/**
 * Relação de Parcerias Celebradas — versão para publicar/imprimir.
 *
 * Layout de documento, não de tela: uma parceria por linha, em tabela, com o
 * cabeçalho institucional e a base legal. A tela de Transparência serve para
 * caçar pendências; este relatório é o que sai do sistema e vira anexo, e por
 * isso mostra só o que a lei manda publicar — as pendências internas ficam de
 * fora, já que publicar a própria lista de irregularidades não é o objetivo.
 *
 * **Não tem variante de tema escuro, de propósito.** É a folha de papel na
 * tela: no modo escuro o documento continua branco, como em qualquer visualizador
 * de PDF, e o que se vê é exatamente o que sai na impressora. Fosse temático,
 * quem trabalha no escuro imprimiria texto claro sobre papel branco — o
 * navegador não imprime o fundo.
 */
export function TransparenciaRelatorio() {
  const navigate = useNavigate();
  const [parcerias, setParcerias] = useState<Parceria[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    http
      .get<Parceria[]>('/transparencia')
      .then((r) => vivo && setParcerias(r.data))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Não foi possível montar o relatório.')));
    return () => {
      vivo = false;
    };
  }, []);

  /** Cabeçalho só nomeia o órgão quando todas as parcerias são do mesmo. */
  const orgao = useMemo(() => {
    const nomes = new Set((parcerias ?? []).map((p) => p.orgaoNome).filter(Boolean));
    return nomes.size === 1 ? [...nomes][0] : null;
  }, [parcerias]);

  const total = (parcerias ?? []).reduce((s, p) => s + p.valorGlobal, 0);

  /** Menor e maior data de assinatura — o "período" que a relação cobre. */
  const periodo = useMemo(() => {
    const datas = (parcerias ?? []).map((p) => p.dataAssinatura).filter(Boolean).sort();
    if (!datas.length) return null;
    return { de: datas[0], ate: datas[datas.length - 1] };
  }, [parcerias]);

  if (erro) return <p className="text-sm font-medium text-red-500">{erro}</p>;

  if (!parcerias)
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
      </div>
    );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
        <Button variant="secondary" onClick={() => navigate('/transparencia')}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Imprimir / PDF
        </Button>
      </div>

      <article className="rounded-2xl bg-white px-10 py-9 text-ink-900 shadow-card ring-1 ring-ink-200 print:rounded-none print:p-0 print:shadow-none print:ring-0">
        <header className="border-b-[3px] border-double border-ink-900 pb-4 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-500">
            {orgao ?? 'Repasses ao Terceiro Setor'}
          </p>
          <h1 className="mt-2 text-xl font-bold uppercase tracking-[0.06em]">
            Relação de Parcerias Celebradas
          </h1>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-500">
            Publicação nos termos do art. 10 da Lei Federal nº 13.019/2014
            {periodo && (
              <>
                {' · '}Instrumentos assinados de {dataBr(periodo.de)} a {dataBr(periodo.ate)}
              </>
            )}
          </p>
        </header>

        {/* Resumo em destaque — o que o leitor procura antes da tabela. */}
        <dl className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-lg bg-ink-200 text-center print:break-inside-avoid">
          <Resumo rotulo="Parcerias" valor={String(parcerias.length)} />
          <Resumo rotulo="Valor global repassado" valor={formatarMoeda(total)} />
          <Resumo
            rotulo="Com prestação apresentada"
            valor={`${parcerias.filter((p) => p.prestacaoStatus).length} de ${parcerias.length}`}
          />
        </dl>

        <table className="mt-6 w-full border-collapse text-[10.5px] leading-snug">
          <thead>
            <tr className="border-y border-ink-900 bg-ink-50 text-left align-bottom uppercase tracking-wide">
              <th className="px-2 py-2 font-semibold">Instrumento</th>
              <th className="px-2 py-2 font-semibold">Organização da sociedade civil</th>
              <th className="px-2 py-2 font-semibold">Objeto</th>
              <th className="px-2 py-2 text-right font-semibold">Valor global</th>
              <th className="px-2 py-2 font-semibold">Vigência</th>
              <th className="px-2 py-2 font-semibold">Publicação</th>
              <th className="px-2 py-2 font-semibold">Prestação</th>
            </tr>
          </thead>
          <tbody>
            {parcerias.map((p, i) => (
              // `break-inside-avoid`: linha de parceria partida entre páginas
              // deixa o objeto órfão do nome da entidade.
              <tr
                key={p.ajusteId}
                className={`border-b border-ink-200 align-top print:break-inside-avoid ${
                  i % 2 ? 'bg-ink-50/60' : ''
                }`}
              >
                <td className="px-2 py-2.5">
                  <span className="font-mono font-semibold">{p.codigoAjuste}</span>
                  {p.numero && <span className="block text-ink-500">nº {p.numero}</span>}
                  <span className="block text-ink-500">
                    {TIPO_AJUSTE_LABEL[p.tipoAjuste as keyof typeof TIPO_AJUSTE_LABEL] ?? p.tipoAjuste}
                  </span>
                  <span className="block text-ink-400">Assinado em {dataBr(p.dataAssinatura)}</span>
                </td>
                <td className="px-2 py-2.5">
                  <span className="font-semibold">{p.entidadeNome}</span>
                  <span className="block text-ink-500">CNPJ {p.entidadeCnpj}</span>
                </td>
                <td className="max-w-[16rem] px-2 py-2.5 text-ink-700">{p.objeto}</td>
                <td className="whitespace-nowrap px-2 py-2.5 text-right font-semibold tabular-nums">
                  {formatarMoeda(p.valorGlobal)}
                </td>
                <td className="whitespace-nowrap px-2 py-2.5 text-ink-600">
                  {p.vigenciaInicial && p.vigenciaFinal ? (
                    <>
                      {dataBr(p.vigenciaInicial)}
                      <span className="block">a {dataBr(p.vigenciaFinal)}</span>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-2 py-2.5 text-ink-600">
                  {p.publicacaoData || p.publicacaoLocal ? (
                    <>
                      {p.publicacaoLocal && <span className="block">{p.publicacaoLocal}</span>}
                      {p.publicacaoData && (
                        <span className="block text-ink-500">{dataBr(p.publicacaoData)}</span>
                      )}
                      {p.publicacaoLink && (
                        <span className="block break-all text-[9px] text-ink-400">
                          {p.publicacaoLink}
                        </span>
                      )}
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-2 py-2.5 text-ink-600">
                  {p.prestacaoStatus ? (
                    <>
                      {STATUS_PRESTACAO_LABEL[p.prestacaoStatus as StatusPrestacao]}
                      {p.prestacaoAno && <span className="block text-ink-400">{p.prestacaoAno}</span>}
                    </>
                  ) : (
                    'Não apresentada'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          {parcerias.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-ink-900">
                <td colSpan={3} className="px-2 py-2.5 text-[11px] font-semibold uppercase">
                  Total — {parcerias.length} parceria(s)
                </td>
                <td className="whitespace-nowrap px-2 py-2.5 text-right text-[11px] font-bold tabular-nums">
                  {formatarMoeda(total)}
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          )}
        </table>

        {parcerias.length === 0 && (
          <p className="border-b border-ink-200 py-12 text-center text-sm text-ink-400">
            Nenhuma parceria celebrada no período.
          </p>
        )}

        <footer className="mt-8 flex items-end justify-between gap-6 text-[9.5px] leading-relaxed text-ink-400">
          <p className="max-w-md">
            Os valores correspondem ao valor global de cada ajuste, atualizado pelos termos aditivos
            registrados. Documento gerado pelo sistema em {new Date().toLocaleString('pt-BR')}.
          </p>
          {/* Linha de assinatura: o documento costuma ser juntado ao processo. */}
          <div className="w-56 shrink-0 border-t border-ink-400 pt-1 text-center text-ink-500">
            Responsável pela publicação
          </div>
        </footer>
      </article>
    </div>
  );
}

function Resumo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="bg-white px-3 py-3">
      <dt className="text-[9.5px] font-medium uppercase tracking-wider text-ink-400">{rotulo}</dt>
      <dd className="mt-0.5 text-sm font-bold tabular-nums">{valor}</dd>
    </div>
  );
}
