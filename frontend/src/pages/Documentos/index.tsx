import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList, Loader2, Printer, ServerCrash } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { extrairMensagemErro } from '@/services/http';
import { termoCiencia, termoConsentimento } from '@/services/documentos.service';
import type { Folha, GrupoAssinaturas, PessoaFolha } from '@/types/documento';

/**
 * Um documento oficial do TCESP, preenchido com o cadastro, pronto para
 * imprimir e assinar.
 *
 * **Uma tela para todos os anexos.** A folha chega montada do servidor — texto
 * oficial, campos preenchidos, signatários — e aqui só se desenha. Um anexo
 * novo não precisa de tela nova: precisa de um montador no `core`.
 *
 * O quadro "O que falta" fica **fora** da impressão e acima da folha: é para
 * quem vai imprimir, não para quem vai assinar. A folha sai mesmo incompleta,
 * com a linha em branco do modelo — e o quadro diz qual cadastro completar
 * para ela sair cheia da próxima vez.
 */
export function DocumentoOficial({ tipo }: { tipo: 'termo-consentimento' | 'termo-ciencia' }) {
  const { id } = useParams<{ id: string }>();
  const [busca] = useSearchParams();
  const prestacaoId = busca.get('prestacaoId') ?? undefined;
  const navigate = useNavigate();
  const [folha, setFolha] = useState<Folha | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setFolha(null);
    setErro(null);
    const pedido = tipo === 'termo-ciencia' ? termoCiencia(id!, prestacaoId) : termoConsentimento();
    pedido
      .then((f) => vivo && setFolha(f))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Não foi possível gerar o documento.')));
    return () => {
      vivo = false;
    };
  }, [tipo, id, prestacaoId]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <Button onClick={() => window.print()} disabled={!folha}>
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

      {!folha && !erro && (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {folha && (
        <>
          {folha.faltando.length > 0 && (
            <section className="mb-4 rounded-xl border border-amber-200 bg-amber-50/60 p-3 print:hidden dark:border-amber-500/30 dark:bg-amber-500/10">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-400">
                <ClipboardList className="h-4 w-4" />
                O que falta cadastrar para o documento sair completo
              </p>
              <ul className="mt-1.5 space-y-1">
                {folha.faltando.map((f) => (
                  <li key={f} className="text-xs text-amber-800 dark:text-amber-300">
                    • {f}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-amber-700/80 dark:text-amber-400/80">
                Pode imprimir assim mesmo: as linhas sem dado saem em branco, como no modelo do TCESP.
              </p>
            </section>
          )}

          <FolhaImpressa folha={folha} />
        </>
      )}
    </div>
  );
}

/**
 * A folha em si. Sempre branca e em tinta preta, mesmo no tema escuro: é a
 * imagem do papel que se vai assinar, e é assim que ela deve ser conferida.
 */
function FolhaImpressa({ folha }: { folha: Folha }) {
  return (
    <article className="rounded-2xl border border-ink-200 bg-white p-8 font-serif text-[13px] lining-nums tabular-nums leading-relaxed text-black shadow-card print:rounded-none print:border-0 print:p-0 print:shadow-none">
      <header className="text-center">
        <h1 className="text-[15px] font-bold">{folha.titulo}</h1>
        <p className="font-bold">{folha.subtitulo}</p>
        {folha.observacao && <p className="mt-1 text-xs italic">{folha.observacao}</p>}
      </header>

      <dl className="mt-6 space-y-1.5">
        {folha.cabecalho.map((c) => (
          <div key={c.rotulo} className="flex gap-2">
            <dt className="shrink-0 font-bold">
              {c.rotulo}
              {c.nota ? ` ${c.nota}` : ''}:
            </dt>
            <dd className="min-w-0 flex-1 border-b border-dotted border-black/50">{c.valor ?? ' '}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 space-y-4 text-justify">
        {folha.secoes.map((s, i) => (
          <section key={i}>
            {s.titulo && <p className="font-bold">{s.titulo}</p>}
            {s.numerada ? (
              <ol className="mt-1 list-decimal space-y-1 pl-6">
                {s.itens.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            ) : (
              s.itens.map((item) => <p key={item}>{item}</p>)
            )}
          </section>
        ))}
      </div>

      <p className="mt-8 font-bold">{folha.localEData}</p>

      <div className="mt-6 space-y-6">
        {folha.assinaturas.map((g, i) => (
          <Grupo key={i} grupo={g} />
        ))}
      </div>

      {folha.notas.length > 0 && (
        <footer className="mt-8 space-y-1 border-t border-black/40 pt-3 text-[11px] leading-snug">
          {folha.notas.map((n) => (
            <p key={n}>{n}</p>
          ))}
        </footer>
      )}
    </article>
  );
}

function Grupo({ grupo }: { grupo: GrupoAssinaturas }) {
  const vazias: PessoaFolha[] = Array.from({ length: grupo.linhasEmBranco }, () => ({
    nome: null,
    cargo: null,
    cpf: null,
    origem: null,
  }));
  const pessoas = [...grupo.pessoas, ...vazias];

  return (
    <section className="break-inside-avoid">
      <p className="font-bold">{grupo.titulo}</p>
      {grupo.subtitulo && <p className="font-bold">{grupo.subtitulo}</p>}
      <div className="mt-1 space-y-4">
        {pessoas.map((p, i) => (
          <div key={i} className="space-y-0.5">
            {grupo.campoExtra && <Linha rotulo={grupo.campoExtra} valor={null} />}
            <Linha rotulo="Nome" valor={p.nome} />
            <Linha rotulo="Cargo" valor={p.cargo} />
            <Linha rotulo="CPF" valor={p.cpf} />
            <Linha rotulo="Assinatura" valor={null} alta />
            {/* De onde o nome saiu: para quem confere antes de imprimir. Não
                vai para o papel — o Tribunal não precisa saber de cadastro. */}
            {p.origem && (
              <p className="text-[11px] italic text-ink-400 print:hidden">fonte: {p.origem}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function Linha({ rotulo, valor, alta }: { rotulo: string; valor: string | null; alta?: boolean }) {
  return (
    <div className={`flex gap-2 ${alta ? 'pt-4' : ''}`}>
      <span className="shrink-0">{rotulo}:</span>
      <span className="min-w-0 flex-1 border-b border-black/50">{valor ?? ' '}</span>
    </div>
  );
}
