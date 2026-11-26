import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock, ExternalLink, Loader2, Undo2 } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { usePermissoes } from '@/contexts/PermissoesContext';
import { extrairMensagemErro } from '@/services/http';
import { TIPO_AJUSTE_LABEL, type TipoAjuste } from '@/types/ajuste';
import {
  desmarcarNegativaAjuste,
  marcarNegativaAjustes,
  painelNegativaAjustes,
  type EstadoTipo,
  type PainelNegativaAjustes,
  type PeriodoNegativa,
} from '@/services/declaracaoNegativa.service';

const PRIMEIRO_ANO = 2024;

const dataBr = (iso: string) => iso.split('-').reverse().join('/');
const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const ESTADO: Record<EstadoTipo, { rotulo: string; tone: 'success' | 'brand' | 'danger' | 'neutral' }> = {
  ASSINADO: { rotulo: 'Ajuste assinado', tone: 'success' },
  DECLARADA: { rotulo: 'Declarada', tone: 'brand' },
  PENDENTE: { rotulo: 'Falta declarar', tone: 'danger' },
  EM_ANDAMENTO: { rotulo: 'Período em andamento', tone: 'neutral' },
};

/**
 * Negativa do módulo Ajustes: por período, os cinco tipos de ajuste e o que
 * falta declarar na tela do Audesp.
 */
export function NegativaAjustes() {
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const [painel, setPainel] = useState<PainelNegativaAjustes | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const podeEditar = usePermissoes().pode('PRESTACAO_CONTAS', 'EDICAO');

  const carregar = useCallback(() => {
    setErro(null);
    painelNegativaAjustes(ano)
      .then(setPainel)
      .catch((e) => {
        setPainel(null);
        setErro(extrairMensagemErro(e, 'Não foi possível carregar a Declaração Negativa.'));
      });
  }, [ano]);

  useEffect(carregar, [carregar]);

  const anos = Array.from({ length: anoAtual - PRIMEIRO_ANO + 1 }, (_, i) => anoAtual - i);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-ink-200 bg-ink-50/70 p-4 text-sm text-ink-600 dark:border-ink-800 dark:bg-ink-800/30 dark:text-ink-300">
        <p>
          A negativa de ajustes diz ao TCESP, <strong>por tipo de ajuste</strong>, que o órgão não assinou nenhum
          ajuste daquele tipo no período. Tipo com ajuste assinado não se declara.
        </p>
        <p className="mt-1.5">
          Ela é feita <strong>na tela do Audesp</strong> (Ajustes → Declaração → Incluir Declaração Negativa), não por
          envio de arquivo. Depois de enviar lá, marque aqui: o sino para de cobrar o período.
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
        {painel && (
          <p className="text-xs text-ink-400">
            Periodicidade do órgão:{' '}
            <strong className="text-ink-600 dark:text-ink-300">
              {painel.periodicidade === 'QUADRIMESTRAL' ? 'Quadrimestral (5 dias úteis)' : 'Anual (15 dias úteis)'}
            </strong>
          </p>
        )}
      </div>

      {erro ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {erro}
        </p>
      ) : !painel ? (
        <p className="py-8 text-center text-sm text-ink-400">Carregando…</p>
      ) : (
        painel.periodos.map((p) => (
          <CartaoPeriodo key={`${p.ano}-${p.periodo}`} periodo={p} podeEditar={podeEditar} aoMudar={carregar} />
        ))
      )}

      <a
        href="https://www.tce.sp.gov.br/legislacao/comunicado/declaracao-negativa-ajustes-terceiro-setor-fase-v-sistema-audesp"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-300"
      >
        Comunicado Audesp 53/2023 — Declaração Negativa
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

function CartaoPeriodo({
  periodo: p,
  podeEditar,
  aoMudar,
}: {
  periodo: PeriodoNegativa;
  podeEditar: boolean;
  aoMudar: () => void;
}) {
  const [marcados, setMarcados] = useState<Set<TipoAjuste>>(new Set());
  const [data, setData] = useState(hojeISO());
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const hoje = hojeISO();
  const fechado = p.fim < hoje;
  const pendentes = p.linhas.filter((l) => l.estado === 'PENDENTE').length;
  const marcaveis = p.linhas.filter((l) => l.estado === 'PENDENTE' || l.estado === 'EM_ANDAMENTO');
  const iniciou = p.inicio <= hoje;

  const alternar = (t: TipoAjuste) =>
    setMarcados((m) => {
      const n = new Set(m);
      if (n.has(t)) n.delete(t);
      else n.add(t);
      return n;
    });

  async function marcar() {
    setSalvando(true);
    setErro(null);
    try {
      await marcarNegativaAjustes({ ano: p.ano, periodo: p.periodo, tipos: [...marcados], declaradaEm: data });
      setMarcados(new Set());
      aoMudar();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível registrar.'));
    } finally {
      setSalvando(false);
    }
  }

  async function desfazer(id: string) {
    setErro(null);
    try {
      await desmarcarNegativaAjuste(id);
      aoMudar();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível desfazer.'));
    }
  }

  return (
    <Card>
      <CardHeader className="flex-wrap">
        <CardTitle>{p.rotulo}</CardTitle>
        <div className="flex items-center gap-2">
          {!iniciou ? (
            <Badge tone="neutral">Ainda não começou</Badge>
          ) : !fechado ? (
            <Badge tone="neutral">
              <Clock className="mr-1 h-3 w-3" /> Em andamento · fecha em {dataBr(p.fim)}
            </Badge>
          ) : pendentes ? (
            <Badge tone={p.prazo < hoje ? 'danger' : 'warning'}>
              {pendentes} a declarar · prazo {dataBr(p.prazo)}
            </Badge>
          ) : (
            <Badge tone="success">
              <CheckCircle2 className="mr-1 h-3 w-3" /> Em dia
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardBody className="pt-3">
        <ul className="divide-y divide-ink-100 dark:divide-ink-800">
          {p.linhas.map((l) => {
            const pode = podeEditar && iniciou && (l.estado === 'PENDENTE' || l.estado === 'EM_ANDAMENTO');
            return (
              <li key={l.tipoAjuste} className="flex flex-wrap items-center gap-3 py-2.5">
                <label className={`flex min-w-[13rem] items-center gap-2 text-sm ${pode ? 'cursor-pointer' : ''}`}>
                  <input
                    type="checkbox"
                    disabled={!pode}
                    checked={marcados.has(l.tipoAjuste)}
                    onChange={() => alternar(l.tipoAjuste)}
                    className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500 disabled:opacity-30"
                  />
                  <span className="font-medium text-ink-800 dark:text-ink-100">{TIPO_AJUSTE_LABEL[l.tipoAjuste]}</span>
                </label>

                <Badge tone={ESTADO[l.estado].tone}>{ESTADO[l.estado].rotulo}</Badge>

                <span className="min-w-0 flex-1 text-xs text-ink-400">
                  {l.estado === 'ASSINADO' &&
                    l.ajustes
                      .map(
                        (a) =>
                          `${a.codigoAjuste} (${dataBr(a.dataAssinatura)}${a.enviado ? '' : ' — ainda não cadastrado no Audesp'})`,
                      )
                      .join(' · ')}
                  {l.estado === 'DECLARADA' && l.declaradaEm && `Enviada no Audesp em ${dataBr(l.declaradaEm)}`}
                </span>

                {l.estado === 'DECLARADA' && l.negativaId && podeEditar && (
                  <Button size="sm" variant="ghost" onClick={() => desfazer(l.negativaId!)}>
                    <Undo2 className="mr-1 h-3.5 w-3.5" /> Desfazer
                  </Button>
                )}
              </li>
            );
          })}
        </ul>

        {podeEditar && iniciou && marcaveis.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3 dark:border-ink-800">
            <span className="text-sm text-ink-500 dark:text-ink-400">Marcar os selecionados como enviados no Audesp em</span>
            <input
              type="date"
              value={data}
              max={hoje}
              min={p.inicio}
              onChange={(e) => setData(e.target.value)}
              className="focus-ring rounded-lg border border-ink-200 bg-white px-2 py-1 text-sm dark:border-ink-700 dark:bg-ink-900"
            />
            <Button size="sm" disabled={!marcados.size || !data || salvando} onClick={marcar}>
              {salvando && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
              Marcar como declarada{marcados.size > 1 ? 's' : ''}
            </Button>
            {marcaveis.length > 1 && (
              <button
                type="button"
                onClick={() => setMarcados(new Set(marcaveis.map((l) => l.tipoAjuste)))}
                className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-300"
              >
                Selecionar todos os que faltam
              </button>
            )}
          </div>
        )}
        {erro && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{erro}</p>}
      </CardBody>
    </Card>
  );
}
