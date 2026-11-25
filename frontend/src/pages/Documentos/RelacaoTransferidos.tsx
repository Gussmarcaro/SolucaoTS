import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList, Loader2, Printer, ServerCrash } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { extrairMensagemErro } from '@/services/http';
import { relacaoTransferidos } from '@/services/documentos.service';
import type { RelacaoTransferidos } from '@/types/relacaoTransferidos';

const valor = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const data = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : '');
const cnpj = (c: string | null) => c?.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') ?? '';

/**
 * ANEXO RP-04 — Relação dos Valores Transferidos.
 *
 * É do **órgão** e do **exercício**, por isso tem a própria escolha de ano e
 * não sai de dentro de uma prestação. Impressa em paisagem: são dez colunas,
 * e em retrato o objeto e o endereço viram uma palavra por linha.
 */
export function RelacaoTransferidosPagina() {
  const navigate = useNavigate();
  const [busca, setBusca] = useSearchParams();
  const exercicio = Number(busca.get('exercicio')) || new Date().getFullYear();
  const [doc, setDoc] = useState<RelacaoTransferidos | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setDoc(null);
    setErro(null);
    relacaoTransferidos(exercicio)
      .then((d) => vivo && setDoc(d))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Não foi possível gerar a relação.')));
    return () => {
      vivo = false;
    };
  }, [exercicio]);

  const anos = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() + 1 - i);
  const celula = 'border border-black/60 px-1 py-0.5 align-top';
  const numero = `${celula} text-right tabular-nums whitespace-nowrap`;

  return (
    <div className="mx-auto max-w-[90rem]">
      {/* Paisagem só para esta página: dez colunas não cabem em retrato. */}
      <style>{'@media print { @page { size: A4 landscape; margin: 10mm; } }'}</style>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 print:hidden">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div className="flex items-end gap-2">
          <label className="text-xs text-ink-500 dark:text-ink-400">
            Exercício
            <Select
              name="exercicio"
              value={String(exercicio)}
              onChange={(e) => setBusca({ exercicio: e.target.value }, { replace: true })}
              options={anos.map((a) => ({ value: String(a), label: String(a) }))}
            />
          </label>
          <Button onClick={() => window.print()} disabled={!doc}>
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>

      {erro && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <ServerCrash className="h-4 w-4 shrink-0" />
          {erro}
        </div>
      )}
      {!doc && !erro && (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {doc && (
        <>
          {doc.faltando.length > 0 && (
            <section className="mb-4 rounded-xl border border-amber-200 bg-amber-50/60 p-3 print:hidden dark:border-amber-500/30 dark:bg-amber-500/10">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-400">
                <ClipboardList className="h-4 w-4" />
                O que falta para a relação sair completa
              </p>
              <ul className="mt-1.5 space-y-1">
                {doc.faltando.map((f) => (
                  <li key={f} className="text-xs text-amber-800 dark:text-amber-300">
                    • {f}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <article className="overflow-x-auto rounded-2xl border border-ink-200 bg-white p-6 font-serif text-[10.5px] leading-snug text-black lining-nums tabular-nums shadow-card print:overflow-visible print:rounded-none print:border-0 print:p-0 print:shadow-none">
            <header className="text-center font-bold">
              <p>ANEXO RP-04 - REPASSES AO TERCEIRO SETOR</p>
              <p>RELAÇÃO DOS VALORES TRANSFERIDOS</p>
            </header>
            <dl className="mt-3 space-y-0.5">
              <div className="flex gap-2">
                <dt className="font-bold">EXERCÍCIO:</dt>
                <dd>{doc.exercicio}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-bold">ÓRGÃO CONCESSOR:</dt>
                <dd>{doc.orgaoNome}</dd>
              </div>
            </dl>

            <p className="mt-3 font-bold">– DECORRENTES DE AJUSTES:</p>
            {doc.grupos.map((g) => (
              <table key={g.tipo} className="mt-2 w-full border-collapse break-inside-avoid">
                <thead>
                  <tr className="font-bold">
                    <th className={celula}>{g.rotulo}</th>
                    <th className={celula}>BENEFICIÁRIO</th>
                    <th className={celula}>CNPJ</th>
                    <th className={celula}>ENDEREÇO (Rua, nº, Cidade, CEP)</th>
                    <th className={celula}>DATA</th>
                    <th className={celula}>VIGÊNCIA ATÉ</th>
                    <th className={celula}>VALOR GLOBAL DO AJUSTE</th>
                    <th className={celula}>OBJETO</th>
                    <th className={celula}>FONTE (*)</th>
                    <th className={celula}>VALOR REPASSADO NO EXERCÍCIO</th>
                  </tr>
                </thead>
                <tbody>
                  {g.linhas.length === 0 ? (
                    <tr>
                      <td className={celula} colSpan={10}>
                        &nbsp;
                      </td>
                    </tr>
                  ) : (
                    g.linhas.map((l) => (
                      <tr key={l.numero}>
                        <td className={celula}>{l.numero}</td>
                        <td className={celula}>{l.beneficiario}</td>
                        <td className={`${celula} whitespace-nowrap`}>{cnpj(l.cnpj)}</td>
                        <td className={celula}>{l.endereco ?? ''}</td>
                        <td className={`${celula} whitespace-nowrap`}>{data(l.data)}</td>
                        <td className={`${celula} whitespace-nowrap`}>{data(l.vigenciaAte)}</td>
                        <td className={numero}>{valor(l.valorGlobal)}</td>
                        <td className={celula}>{l.objeto}</td>
                        <td className={celula}>{l.fonte}</td>
                        <td className={numero}>{valor(l.repassadoNoExercicio)}</td>
                      </tr>
                    ))
                  )}
                  <tr className="font-bold">
                    <td className={celula} colSpan={6}>
                      TOTAL
                    </td>
                    <td className={numero}>{valor(g.totalValorGlobal)}</td>
                    <td className={celula} colSpan={2} />
                    <td className={numero}>{valor(g.totalRepassado)}</td>
                  </tr>
                </tbody>
              </table>
            ))}

            <p className="mt-4 font-bold">– AUXÍLIOS, SUBVENÇÕES E/OU CONTRIBUIÇÕES PAGOS:</p>
            <table className="mt-2 w-full border-collapse break-inside-avoid">
              <thead>
                <tr className="font-bold">
                  <th className={celula}>TIPO DA CONCESSÃO (A / S / C)</th>
                  <th className={celula}>BENEFICIÁRIO</th>
                  <th className={celula}>CNPJ</th>
                  <th className={celula}>ENDEREÇO (Rua, n°, Cidade, CEP)</th>
                  <th className={celula}>LEI N° DATA</th>
                  <th className={celula}>FINALIDADE</th>
                  <th className={celula}>DATA DO PGTO</th>
                  <th className={celula}>FONTE (*)</th>
                  <th className={celula}>VALOR REPASSADO NO EXERCÍCIO</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={celula} colSpan={9}>
                    &nbsp;
                  </td>
                </tr>
                <tr className="font-bold">
                  <td className={celula} colSpan={8}>
                    TOTAL
                  </td>
                  <td className={numero} />
                </tr>
              </tbody>
            </table>

            <div className="mt-6 grid grid-cols-1 gap-4 break-inside-avoid sm:grid-cols-2 print:grid-cols-2">
              <p className="font-bold">{doc.localEData}</p>
              <div className="space-y-0.5">
                <p className="font-bold">RESPONSÁVEL: (nome, cargo e assinatura)</p>
                {(
                  [
                    ['Nome', doc.responsavel.nome],
                    ['Cargo', doc.responsavel.cargo],
                    ['CPF', doc.responsavel.cpf],
                    ['Assinatura', null],
                  ] as [string, string | null][]
                ).map(([r, x]) => (
                  <div key={r} className={`flex gap-2 ${r === 'Assinatura' ? 'pt-4' : ''}`}>
                    <span className="shrink-0">{r}:</span>
                    <span className="min-w-0 flex-1 border-b border-black/50">{x ?? ' '}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-3 text-[9.5px]">{doc.nota}</p>
          </article>
        </>
      )}
    </div>
  );
}
