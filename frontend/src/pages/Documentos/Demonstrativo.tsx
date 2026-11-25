import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList, Loader2, Printer, RotateCcw, ServerCrash } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { extrairMensagemErro } from '@/services/http';
import { demonstrativoIntegral } from '@/services/documentos.service';
import {
  ROTULO_ESFERA,
  type AnexoEsfera,
  type DemonstrativoIntegral,
  type Esfera,
} from '@/types/demonstrativo';

const valor = (v: number | null | undefined) =>
  v == null ? '' : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const data = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : '');

/**
 * Demonstrativo Integral das Receitas e Despesas — um anexo por esfera, cada
 * um numa folha.
 *
 * O quadro "Saldo do exercício anterior" fica **fora** da impressão. É a única
 * coisa do documento que a pessoa pode mudar aqui, e só porque o sistema às
 * vezes não tem como saber: parceria com movimento anterior à implantação, ou
 * sem a prestação do ano anterior lançada. O valor digitado vai no endereço e
 * não é gravado — é a decisão de quem assina, não um dado do sistema.
 */
export function DemonstrativoIntegralPagina() {
  const { id } = useParams<{ id: string }>();
  const [busca, setBusca] = useSearchParams();
  const saldoNaUrl = busca.get('saldoAnterior') ?? '';
  const navigate = useNavigate();
  const [doc, setDoc] = useState<DemonstrativoIntegral | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [saldos, setSaldos] = useState<Partial<Record<Esfera, string>>>({});

  useEffect(() => {
    let vivo = true;
    setErro(null);
    demonstrativoIntegral(id!, saldoNaUrl)
      .then((d) => {
        if (!vivo) return;
        setDoc(d);
        setSaldos(Object.fromEntries(d.anexos.map((a) => [a.esfera, valor(a.A)])));
      })
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Não foi possível gerar o demonstrativo.')));
    return () => {
      vivo = false;
    };
  }, [id, saldoNaUrl]);

  function aplicarSaldo() {
    const texto = Object.entries(saldos)
      .map(([e, v]) => `${e}:${(v ?? '').trim() || '0'}`)
      .join(';');
    setBusca({ saldoAnterior: texto }, { replace: true });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <Button onClick={() => window.print()} disabled={!doc}>
          <Printer className="h-4 w-4" />
          Imprimir
        </Button>
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
          <section className="mb-4 space-y-3 print:hidden">
            {doc.faltando.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-400">
                  <ClipboardList className="h-4 w-4" />
                  Antes de assinar, confira
                </p>
                <ul className="mt-1.5 space-y-1">
                  {doc.faltando.map((f) => (
                    <li key={f} className="text-xs text-amber-800 dark:text-amber-300">
                      • {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-xl border border-ink-200 p-3 dark:border-ink-700">
              <p className="text-sm font-medium text-ink-700 dark:text-ink-200">
                (A) Saldo do exercício anterior
              </p>
              <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">
                {saldoNaUrl
                  ? 'Usando o valor informado aqui — não é gravado, vale para esta impressão.'
                  : `Calculado pelas Disponibilidades da prestação de ${doc.exercicio - 1}. Corrija se a parceria tem movimento anterior ao sistema.`}
              </p>
              <div className="mt-2 flex flex-wrap items-end gap-3">
                {doc.anexos.map((a) => (
                  <label key={a.esfera} className="text-xs text-ink-500 dark:text-ink-400">
                    {ROTULO_ESFERA[a.esfera]}
                    <input
                      value={saldos[a.esfera] ?? ''}
                      onChange={(e) => setSaldos((s) => ({ ...s, [a.esfera]: e.target.value.replace(/[^\d,.-]/g, '') }))}
                      inputMode="decimal"
                      className="focus-ring mt-0.5 block h-9 w-40 rounded-lg border border-ink-200 bg-white px-2 text-right text-sm tabular-nums text-ink-800 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
                    />
                  </label>
                ))}
                <Button size="sm" variant="secondary" onClick={aplicarSaldo}>
                  Recalcular
                </Button>
                {saldoNaUrl && (
                  <Button size="sm" variant="secondary" onClick={() => setBusca({}, { replace: true })}>
                    <RotateCcw className="h-3.5 w-3.5" />
                    Voltar ao calculado
                  </Button>
                )}
              </div>
            </div>
          </section>

          <div className="space-y-6 print:space-y-0">
            {doc.anexos.map((a, i) => (
              <Anexo key={a.esfera} doc={doc} anexo={a} primeiro={i === 0} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const celula = 'border border-black/60 px-1.5 py-1';
const numero = `${celula} text-right tabular-nums`;

/** Uma via do anexo — a de uma esfera. Sempre branca e preta: é a imagem do papel. */
function Anexo({ doc, anexo: a, primeiro }: { doc: DemonstrativoIntegral; anexo: AnexoEsfera; primeiro: boolean }) {
  const v = doc.vocabulario;
  const origem = ROTULO_ESFERA[a.esfera];
  const linha = (rotulo: string, x: number) => (
    <tr>
      <td className={celula}>{rotulo}</td>
      <td className={numero}>{valor(x)}</td>
    </tr>
  );

  return (
    <article
      className={`rounded-2xl border border-ink-200 bg-white p-6 font-serif text-[11px] leading-snug text-black lining-nums tabular-nums shadow-card print:rounded-none print:border-0 print:p-0 print:shadow-none ${primeiro ? '' : 'print:break-before-page'}`}
    >
      <header className="text-center font-bold">
        <p>ANEXO {v.anexo} - REPASSES AO TERCEIRO SETOR</p>
        <p>DEMONSTRATIVO INTEGRAL DAS RECEITAS E DESPESAS</p>
        <p>{v.modalidade}</p>
      </header>

      <dl className="mt-4 space-y-0.5">
        {(
          [
            [v.rotuloOrgao, doc.orgaoNome],
            [v.rotuloEntidade, doc.entidade.nome],
            ...(v.rotuloGerenciada ? ([[v.rotuloGerenciada, null]] as [string, string | null][]) : []),
            ['CNPJ', doc.entidade.cnpj?.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') ?? null],
            ['ENDEREÇO E CEP', doc.entidade.endereco],
            [v.rotuloResponsavel, doc.responsavel.nome],
            ['CPF', doc.responsavel.cpf],
            [v.rotuloObjeto, doc.objeto],
            ['EXERCÍCIO', String(doc.exercicio)],
            ['ORIGEM DOS RECURSOS (1)', origem],
          ] as [string, string | null][]
        ).map(([r, x]) => (
          <div key={r} className="flex gap-2">
            <dt className="shrink-0 font-bold">{r}:</dt>
            <dd className="min-w-0 flex-1 border-b border-dotted border-black/50">{x ?? ' '}</dd>
          </div>
        ))}
      </dl>

      <table className="mt-3 w-full border-collapse">
        <thead>
          <tr className="font-bold">
            <th className={celula}>DOCUMENTO</th>
            <th className={celula}>DATA</th>
            <th className={celula}>VIGÊNCIA</th>
            <th className={celula}>VALOR - R$</th>
          </tr>
        </thead>
        <tbody>
          {doc.instrumentos.map((i) => (
            <tr key={i.documento}>
              <td className={celula}>{i.documento}</td>
              <td className={celula}>{data(i.data)}</td>
              <td className={celula}>{i.vigencia ?? ''}</td>
              <td className={numero}>{valor(i.valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-4 text-center font-bold">DEMONSTRATIVO DOS RECURSOS DISPONÍVEIS NO EXERCÍCIO</p>
      <table className="mt-1 w-full border-collapse">
        <thead>
          <tr className="font-bold">
            <th className={celula}>DATA PREVISTA PARA O REPASSE (2)</th>
            <th className={celula}>VALORES PREVISTOS (R$)</th>
            <th className={celula}>DATA DO REPASSE</th>
            <th className={celula}>NÚMERO DO DOCUMENTO DE CRÉDITO</th>
            <th className={celula}>VALORES REPASSADOS (R$)</th>
          </tr>
        </thead>
        <tbody>
          {(a.repasses.length ? a.repasses : [null]).map((r, i) => (
            <tr key={i}>
              <td className={celula}>{r ? data(r.dataPrevista) : ' '}</td>
              <td className={numero}>{r ? valor(r.valorPrevisto) : ''}</td>
              <td className={celula}>{r ? data(r.dataRepasse) : ''}</td>
              <td className={celula}>{r?.numeroDocumento ?? ''}</td>
              <td className={numero}>{r ? valor(r.valorRepasse) : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className="mt-2 w-full border-collapse">
        <tbody>
          {linha('(A) SALDO DO EXERCÍCO ANTERIOR', a.A)}
          {linha('(B) REPASSES PÚBLICOS NO EXERCÍCIO', a.B)}
          {linha('(C) RECEITAS COM APLICAÇÕES FINANCEIRAS DOS REPASSES PÚBLICOS', a.C)}
          {linha('(D) OUTRAS RECEITAS DECORRENTES DA EXECUÇÃO DO AJUSTE (3)', a.D)}
          {linha('(E) TOTAL DE RECURSOS PÚBLICOS (A + B+ C + D)', a.E)}
          {linha(v.rotuloProprios, a.F)}
          {linha('(G) TOTAL DE RECURSOS DISPONÍVEIS NO EXERCÍCIO (E + F)', a.G)}
        </tbody>
      </table>
      <div className="mt-1 space-y-0.5 text-[9.5px]">
        {doc.textos.notasRecursos.map((n) => (
          <p key={n}>{n}</p>
        ))}
      </div>

      <p className="mt-4 text-justify">{doc.textos.signatario}</p>

      <p className="mt-3 text-center font-bold">DEMONSTRATIVO DAS DESPESAS INCORRIDAS NO EXERCÍCIO</p>
      <p className="text-center font-bold">ORIGEM DOS RECURSOS (4): {origem}</p>
      <table className="mt-1 w-full border-collapse">
        <thead>
          <tr className="text-[9.5px] font-bold">
            <th className={celula}>CATEGORIA OU FINALIDADE DA DESPESA (8)</th>
            <th className={celula}>DESPESAS CONTABILIZADAS NESTE EXERCÍCIO (R$)</th>
            <th className={celula}>DESPESAS CONTABILIZADAS EM EXERCÍCIOS ANTERIORES E PAGAS NESTE EXERCÍCIO (R$) (H)</th>
            <th className={celula}>DESPESAS CONTABILIZADAS NESTE EXERCÍCIO E PAGAS NESTE EXERCÍCIO (R$) (I)</th>
            <th className={celula}>TOTAL DE DESPESAS PAGAS NESTE EXERCÍCIO (R$) (J= H + I)</th>
            <th className={celula}>DESPESAS CONTABILIZADAS NESTE EXERCÍCIO A PAGAR EM EXERCÍCIOS SEGUINTES (R$)</th>
          </tr>
        </thead>
        <tbody>
          {[...a.despesas, { id: 'TOTAL', rotulo: 'TOTAL', ...a.totalDespesas }].map((d) => (
            <tr key={d.id} className={d.id === 'TOTAL' ? 'font-bold' : ''}>
              <td className={celula}>{d.rotulo}</td>
              <td className={numero}>{valor(d.contabilizadas)}</td>
              <td className={numero}>{valor(d.anterioresPagas)}</td>
              <td className={numero}>{valor(d.contabilizadasPagas)}</td>
              <td className={numero}>{valor(d.totalPago)}</td>
              <td className={numero}>{valor(d.aPagar)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-1 space-y-0.5 text-[9.5px]">
        {doc.textos.notasDespesas.map((n) => (
          <p key={n}>{n}</p>
        ))}
      </div>

      <p className="mt-4 text-center font-bold">DEMONSTRATIVO DO SALDO FINANCEIRO DO EXERCÍCIO</p>
      <table className="mt-1 w-full border-collapse break-inside-avoid">
        <tbody>
          {linha('(G) TOTAL DE RECURSOS DISPONÍVEL NO EXERCÍCIO', a.G)}
          {linha('(J) DESPESAS PAGAS NO EXERCÍCIO (H+I)', a.J)}
          {linha('(K) RECURSO PÚBLICO NÃO APLICADO [E – (J – F)]', a.K)}
          {linha('(L) VALOR DEVOLVIDO AO ÓRGÃO PÚBLICO', a.L)}
          {linha('(M) VALOR AUTORIZADO PARA APLICAÇÃO NO EXERCÍCIO SEGUINTE (K – L)', a.M)}
        </tbody>
      </table>

      <p className="mt-4 text-justify">{doc.textos.declaracao}</p>
      <div className="mt-6 break-inside-avoid space-y-4">
        <p className="font-bold">{doc.localEData}</p>
        <p className="font-bold">{v.assinantes}: (nome, cargo e assinatura)</p>
        {[doc.responsavel, { nome: null, cargo: null, cpf: null }].map((p, i) => (
          <div key={i} className="space-y-0.5 pt-2">
            <Linha r="Nome" x={p.nome} />
            <Linha r="Cargo" x={p.cargo} />
            <Linha r="Assinatura" x={null} />
          </div>
        ))}
      </div>
    </article>
  );
}

function Linha({ r, x }: { r: string; x: string | null }) {
  return (
    <div className="flex gap-2">
      <span className="shrink-0">{r}:</span>
      <span className="min-w-0 flex-1 border-b border-black/50">{x ?? ' '}</span>
    </div>
  );
}
