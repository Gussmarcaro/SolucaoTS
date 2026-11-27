import { useEffect, useState } from 'react';
import { Download, Loader2, Lock, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { extrairMensagemErro } from '@/services/http';
import {
  documentoEnviado,
  iniciarRetificacao,
  listarEnvios,
  preverRetificacao,
  type EnvioPrestacao,
  type PrevisaoRetificacao,
} from '@/services/prestacoes.service';
import type { Prestacao } from '@/types/prestacao';

/**
 * O que foi ao TCESP e o caminho para mandar outra versão.
 *
 * - **Travada**: transmitida à produção e valendo, os blocos não aceitam
 *   edição — a tela e o Tribunal mostrariam coisas diferentes.
 * - **Envios**: cada transmissão aceita, com o JSON exato para baixar e a
 *   impressão digital (sha-256) que prova qual versão foi.
 * - **Retificar**: reabre a armazenada como retificação (ou converte a
 *   negativa em prestação), avisando antes se o TCESP vai excluir exercícios
 *   posteriores.
 */
export function PainelEnvios({ prestacao, aoMudar }: { prestacao: Prestacao; aoMudar: () => void }) {
  const [envios, setEnvios] = useState<EnvioPrestacao[] | null>(null);
  const [previsao, setPrevisao] = useState<PrevisaoRetificacao | null>(null);
  const [ciente, setCiente] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    listarEnvios(prestacao.id)
      .then((e) => vivo && setEnvios(e))
      .catch(() => vivo && setEnvios([]));
    return () => {
      vivo = false;
    };
  }, [prestacao.id, prestacao.status]);

  const armazenadaProducao =
    prestacao.status === 'ARMAZENADO' && (envios ?? []).some((e) => e.ambiente === 'PRODUCAO');

  async function abrirRetificacao() {
    setErro(null);
    setCiente(false);
    try {
      setPrevisao(await preverRetificacao(prestacao.id));
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível preparar a retificação.'));
    }
  }

  async function confirmar() {
    if (!previsao) return;
    setOcupado(true);
    setErro(null);
    try {
      await iniciarRetificacao(prestacao.id, ciente);
      setPrevisao(null);
      aoMudar();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível iniciar a retificação.'));
    } finally {
      setOcupado(false);
    }
  }

  async function baixar(e: EnvioPrestacao) {
    try {
      const r = await documentoEnviado(prestacao.id, e.id);
      const blob = new Blob([JSON.stringify(r.documento, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `enviado-${prestacao.ajusteCodigo}-${prestacao.ano}-${e.protocolo}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setErro(extrairMensagemErro(err, 'Não foi possível baixar o JSON enviado.'));
    }
  }

  if (!prestacao.travada && !envios?.length) return null;

  const negativa = previsao?.acao === 'CONVERTER_NEGATIVA';

  return (
    <div className="mb-6 space-y-3">
      {prestacao.travada && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="text-sm text-amber-900 dark:text-amber-200">
              <p className="font-semibold">Prestação transmitida ao TCESP — edição travada</p>
              <p className="mt-0.5 text-amber-800/90 dark:text-amber-300/90">
                {prestacao.status === 'ENVIADO'
                  ? 'Aguardando o processamento do Tribunal. Consulte o status: se for rejeitada, a edição volta a ser liberada.'
                  : 'O que está aqui é o que o Tribunal armazenou. Para enviar outra versão, inicie uma retificação.'}
              </p>
            </div>
          </div>
          {armazenadaProducao && (
            <Button size="sm" variant="secondary" onClick={abrirRetificacao}>
              <RotateCcw className="h-4 w-4" />
              {prestacao.declaracaoNegativa ? 'Converter em prestação de contas' : 'Iniciar retificação'}
            </Button>
          )}
        </div>
      )}

      {!!envios?.length && (
        <details className="rounded-2xl border border-ink-200/70 bg-white px-5 py-3 shadow-card dark:border-ink-800/70 dark:bg-ink-900">
          <summary className="cursor-pointer text-sm font-semibold text-ink-700 dark:text-ink-200">
            Envios ao TCESP ({envios.length})
          </summary>
          <ul className="mt-3 divide-y divide-ink-100 dark:divide-ink-800">
            {envios.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                <Badge tone={e.ambiente === 'PRODUCAO' ? 'brand' : 'neutral'}>
                  {e.ambiente === 'PRODUCAO' ? 'Produção' : 'Piloto'}
                </Badge>
                {e.retificacao && <Badge tone="warning">Retificação</Badge>}
                <span className="font-mono text-ink-700 dark:text-ink-200">{e.protocolo}</span>
                <span className="text-xs text-ink-400">
                  {new Date(e.criadoEm).toLocaleString('pt-BR')}
                  {e.criadoPorNome ? ` · ${e.criadoPorNome}` : ''}
                </span>
                <span className="font-mono text-[11px] text-ink-400" title={`sha-256: ${e.hash}`}>
                  {e.hash.slice(0, 12)}…
                </span>
                <Button size="sm" variant="ghost" className="ml-auto" onClick={() => baixar(e)}>
                  <Download className="h-3.5 w-3.5" /> JSON enviado
                </Button>
              </li>
            ))}
          </ul>
        </details>
      )}

      {erro && !previsao && <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>}

      <Modal
        open={!!previsao}
        onClose={() => setPrevisao(null)}
        title={negativa ? 'Converter a negativa em prestação de contas' : 'Iniciar retificação'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPrevisao(null)} disabled={ocupado}>
              Cancelar
            </Button>
            <Button onClick={confirmar} disabled={ocupado || (!!previsao?.posteriores.length && !ciente)}>
              {ocupado && <Loader2 className="h-4 w-4 animate-spin" />}
              {negativa ? 'Converter' : 'Iniciar retificação'}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-ink-600 dark:text-ink-300">
          {negativa ? (
            <p>
              A negativa diz que não houve repasse em {prestacao.ano}. Convertendo, a prestação volta a ser editável com
              todos os blocos, e o envio dela <strong>sobrescreve a negativa</strong> no TCESP.
            </p>
          ) : (
            <p>
              A prestação volta a ser editável e o próximo envio vai como <strong>retificação</strong>: a prestação
              completa, que <strong>substitui</strong> a armazenada. Fora do prazo, o TCESP pode exigir autorização da
              Fiscalização.
            </p>
          )}
          {!!previsao?.posteriores.length && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              <p className="font-medium">
                O TCESP vai excluir as prestações já armazenadas de {previsao.posteriores.join(', ')}.
              </p>
              <p className="mt-1">Elas terão de ser reenviadas depois desta.</p>
              <label className="mt-2 flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={ciente}
                  onChange={(e) => setCiente(e.target.checked)}
                  className="h-4 w-4 rounded border-red-300 text-red-600"
                />
                Estou ciente e quero continuar
              </label>
            </div>
          )}
          {erro && <p className="text-red-600 dark:text-red-400">{erro}</p>}
        </div>
      </Modal>
    </div>
  );
}
