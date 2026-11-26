import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FilePlus2, Loader2 } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { usePermissoes } from '@/contexts/PermissoesContext';
import { extrairMensagemErro } from '@/services/http';
import { criarPrestacao } from '@/services/prestacoes.service';
import { TIPO_AJUSTE_LABEL } from '@/types/ajuste';
import { STATUS_PRESTACAO_LABEL, STATUS_PRESTACAO_TONE, type StatusPrestacao } from '@/types/prestacao';
import {
  painelNegativaPrestacao,
  type LinhaNegativaPrestacao,
  type SituacaoNegativaPrestacao,
} from '@/services/declaracaoNegativa.service';

/** A prestação de contas da Fase V é obrigatória a partir do exercício 2025. */
const PRIMEIRO_ANO = 2025;

const dataBr = (iso: string) => iso.split('-').reverse().join('/');

const SITUACAO: Record<SituacaoNegativaPrestacao, { rotulo: string; tone: 'warning' | 'neutral' | 'brand' | 'success' }> = {
  SUGERIDA: { rotulo: 'Cabe negativa', tone: 'warning' },
  COM_EMPENHO: { rotulo: 'Tem empenho no ano', tone: 'neutral' },
  NEGATIVA: { rotulo: 'Negativa criada', tone: 'brand' },
  PRESTACAO: { rotulo: 'Tem prestação', tone: 'success' },
};

/**
 * Negativa da prestação de contas: por ajuste e exercício, para o ajuste sem
 * repasse nos exercícios iniciais. Cria a negativa como uma prestação marcada,
 * e o envio segue pela tela da prestação (Gerar JSON / Transmitir).
 */
export function NegativaPrestacao() {
  const navigate = useNavigate();
  const anoAtual = new Date().getFullYear();
  // O exercício que se presta é o anterior: em 2026 entrega-se 2025.
  const [ano, setAno] = useState(Math.max(PRIMEIRO_ANO, anoAtual - 1));
  const [linhas, setLinhas] = useState<LinhaNegativaPrestacao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [criando, setCriando] = useState<string | null>(null);
  const podeIncluir = usePermissoes().pode('PRESTACAO_CONTAS', 'EDICAO');

  useEffect(() => {
    let vivo = true;
    setLinhas(null);
    setErro(null);
    painelNegativaPrestacao(ano)
      .then((r) => vivo && setLinhas(r.linhas))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Não foi possível carregar os ajustes.')));
    return () => {
      vivo = false;
    };
  }, [ano]);

  async function criar(l: LinhaNegativaPrestacao) {
    if (
      l.situacao === 'COM_EMPENHO' &&
      !window.confirm(
        `O ajuste ${l.codigoAjuste} tem ${l.empenhosNoAno} empenho(s) emitido(s) em ${ano}. A negativa só cabe se não houve repasse no exercício. Criar mesmo assim?`,
      )
    )
      return;
    setCriando(l.ajusteId);
    setErro(null);
    try {
      const p = await criarPrestacao({ ajusteId: l.ajusteId, ano, declaracaoNegativa: true });
      navigate(`/prestacao-contas/${p.id}`);
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível criar a declaração negativa.'));
      setCriando(null);
    }
  }

  const anos = Array.from({ length: anoAtual - PRIMEIRO_ANO + 1 }, (_, i) => anoAtual - i);
  const sugeridas = linhas?.filter((l) => l.situacao === 'SUGERIDA').length ?? 0;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-ink-200 bg-ink-50/70 p-4 text-sm text-ink-600 dark:border-ink-800 dark:bg-ink-800/30 dark:text-ink-300">
        <p>
          A obrigação de prestar contas começa <strong>no ano da assinatura</strong> do ajuste. Nos exercícios iniciais
          <strong> sem repasse</strong>, envia-se a Declaração Negativa no lugar da prestação — um JSON só com o
          descritor e o código do ajuste.
        </p>
        <p className="mt-1.5">
          A lista sugere a negativa para o ajuste sem prestação e sem empenho emitido no exercício. Confirme que não
          houve repasse antes de enviar.
        </p>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-40">
          <Select
            label="Exercício"
            value={String(ano)}
            onChange={(e) => setAno(Number(e.target.value))}
            options={anos.map((a) => ({ value: String(a), label: String(a) }))}
          />
        </div>
        {linhas && sugeridas > 0 && (
          <Badge tone="warning">
            {sugeridas} ajuste{sugeridas > 1 ? 's' : ''} sem repasse em {ano}
          </Badge>
        )}
      </div>

      {erro && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {erro}
        </p>
      )}

      <Card>
        <CardBody>
          {!linhas ? (
            !erro && <p className="py-6 text-center text-sm text-ink-400">Carregando…</p>
          ) : linhas.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-400">
              Nenhum ajuste em exercício inicial em {ano} — não há negativa a enviar.
            </p>
          ) : (
            <ul className="divide-y divide-ink-100 dark:divide-ink-800">
              {linhas.map((l) => (
                <li key={l.ajusteId} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-medium text-ink-800 dark:text-ink-100">{l.codigoAjuste}</p>
                    <p className="mt-0.5 truncate text-xs text-ink-400">
                      {TIPO_AJUSTE_LABEL[l.tipoAjuste]} · {l.entidadeNome} · assinado em {dataBr(l.dataAssinatura)}
                    </p>
                  </div>
                  <Badge tone={SITUACAO[l.situacao].tone}>
                    {l.situacao === 'COM_EMPENHO'
                      ? `${l.empenhosNoAno} empenho${l.empenhosNoAno > 1 ? 's' : ''} em ${ano}`
                      : SITUACAO[l.situacao].rotulo}
                  </Badge>
                  {l.situacao === 'NEGATIVA' && l.status && (
                    <Badge tone={STATUS_PRESTACAO_TONE[l.status as StatusPrestacao]}>
                      {STATUS_PRESTACAO_LABEL[l.status as StatusPrestacao] ?? l.status}
                    </Badge>
                  )}

                  {l.prestacaoId ? (
                    <Button size="sm" variant="secondary" onClick={() => navigate(`/prestacao-contas/${l.prestacaoId}`)}>
                      Abrir <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    podeIncluir && (
                      <Button
                        size="sm"
                        variant={l.situacao === 'SUGERIDA' ? 'primary' : 'secondary'}
                        disabled={criando !== null}
                        onClick={() => criar(l)}
                      >
                        {criando === l.ajusteId ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <FilePlus2 className="h-3.5 w-3.5" />
                        )}
                        Criar declaração negativa
                      </Button>
                    )
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
