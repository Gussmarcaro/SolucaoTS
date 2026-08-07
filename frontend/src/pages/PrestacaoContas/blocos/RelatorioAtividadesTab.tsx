import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { apenasDigitos } from '@/lib/masks';
import { extrairMensagemErro } from '@/services/http';
import { afericoesApi } from '@/services/prestacaoBlocos2.service';
import { listarProgramas } from '@/services/programas.service';
import type { Programa } from '@/types/programa';
import { RESULTADO_META_LABEL, type AfericaoMeta, type AfericaoMetaPayload, type ResultadoMeta } from '@/types/prestacaoBlocos6';
import { ConfirmarExclusao } from '@/pages/Ajustes/tabs/TermosAditivosTab';
import { AlertaErro, IconBtn } from './_ui';

type ModalState = { tipo: 'fechado' } | { tipo: 'form'; item: AfericaoMeta | null } | { tipo: 'excluir'; item: AfericaoMeta };

const RESULTADOS: { value: ResultadoMeta; label: string }[] = (Object.keys(RESULTADO_META_LABEL) as ResultadoMeta[]).map((r) => ({ value: r, label: RESULTADO_META_LABEL[r] }));

export function RelatorioAtividadesTab({ prestacaoId, ajusteId }: { prestacaoId: string; ajusteId: string }) {
  const [lista, setLista] = useState<AfericaoMeta[]>([]);
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ tipo: 'fechado' });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    Promise.all([afericoesApi.listar(prestacaoId), listarProgramas(ajusteId)])
      .then(([afs, progs]) => { if (!vivo) return; setLista(afs); setProgramas(progs); })
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Falha ao carregar o relatório.')))
      .finally(() => vivo && setCarregando(false));
    return () => { vivo = false; };
  }, [prestacaoId, ajusteId, refreshKey]);

  const recarregar = () => { setModal({ tipo: 'fechado' }); setRefreshKey((k) => k + 1); };
  const semProgramas = !carregando && programas.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500 dark:text-ink-400">Aferição das metas do ajuste por período — selecionadas do plano de metas (§19).</p>
        <Button size="sm" onClick={() => setModal({ tipo: 'form', item: null })} disabled={semProgramas}><Plus className="h-4 w-4" />Adicionar</Button>
      </div>

      {semProgramas && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Cadastre os Programas e Metas no ajuste (aba “Programas e Metas”) antes de preencher o relatório.</span>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-ink-200/70 dark:border-ink-800/70">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-xs font-semibold text-ink-500 dark:border-ink-800 dark:text-ink-400">
              <th className="px-4 py-2.5">Programa</th>
              <th className="px-4 py-2.5">Meta</th>
              <th className="px-4 py-2.5 text-center">Período</th>
              <th className="px-4 py-2.5">Realizado / Resultado</th>
              <th className="px-4 py-2.5 text-center">Atendida</th>
              <th className="px-4 py-2.5 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
            {carregando ? (
              <tr><td colSpan={6} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-brand-500" /></td></tr>
            ) : erro ? (
              <tr><td colSpan={6} className="py-10 text-center text-sm text-red-500">{erro}</td></tr>
            ) : lista.length === 0 ? (
              <tr><td colSpan={6} className="py-10 text-center text-sm text-ink-400">Nenhuma aferição cadastrada.</td></tr>
            ) : (
              lista.map((a) => (
                <tr key={a.id} className="hover:bg-ink-50/70 dark:hover:bg-ink-800/40">
                  <td className="px-4 py-2.5 text-ink-700 dark:text-ink-200" title={a.nomePrograma}>{a.nomePrograma}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-ink-600 dark:text-ink-300">{a.codigoMeta}</td>
                  <td className="px-4 py-2.5 text-center text-ink-600 dark:text-ink-300">{a.periodo}</td>
                  <td className="px-4 py-2.5 text-ink-600 dark:text-ink-300">
                    {a.quantidadeRealizada != null ? a.quantidadeRealizada : a.resultadoMeta ? RESULTADO_META_LABEL[a.resultadoMeta] : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {a.metaAtendida == null ? <span className="text-ink-400">—</span> : <Badge tone={a.metaAtendida ? 'success' : 'danger'}>{a.metaAtendida ? 'Sim' : 'Não'}</Badge>}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      <IconBtn title="Editar" onClick={() => setModal({ tipo: 'form', item: a })}><Pencil className="h-4 w-4" /></IconBtn>
                      <IconBtn title="Excluir" danger onClick={() => setModal({ tipo: 'excluir', item: a })}><Trash2 className="h-4 w-4" /></IconBtn>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modal.tipo === 'form'} onClose={() => setModal({ tipo: 'fechado' })} title={modal.tipo === 'form' && modal.item ? 'Editar Aferição' : 'Nova Aferição de Meta'} size="lg">
        {modal.tipo === 'form' && <AfericaoForm prestacaoId={prestacaoId} programas={programas} item={modal.item} onSuccess={recarregar} onCancel={() => setModal({ tipo: 'fechado' })} />}
      </Modal>
      <ConfirmarExclusao
        aberto={modal.tipo === 'excluir'}
        rotulo={modal.tipo === 'excluir' ? `a aferição da meta ${modal.item.codigoMeta} (período ${modal.item.periodo})` : ''}
        onCancel={() => setModal({ tipo: 'fechado' })}
        onConfirm={async () => { if (modal.tipo !== 'excluir') return; await afericoesApi.excluir(prestacaoId, modal.item.id); recarregar(); }}
      />
    </div>
  );
}

function AfericaoForm({ prestacaoId, programas, item, onSuccess, onCancel }: { prestacaoId: string; programas: Programa[]; item: AfericaoMeta | null; onSuccess: () => void; onCancel: () => void }) {
  const [nomePrograma, setNomePrograma] = useState(item?.nomePrograma ?? programas[0]?.nome ?? '');
  const [codigoMeta, setCodigoMeta] = useState(item?.codigoMeta ?? '');
  const [periodo, setPeriodo] = useState(item ? String(item.periodo) : '1');
  const [quantidade, setQuantidade] = useState(item?.quantidadeRealizada != null ? String(item.quantidadeRealizada) : '');
  const [resultado, setResultado] = useState<ResultadoMeta>(item?.resultadoMeta ?? 'CUMPRIDA');
  const [justPeriodo, setJustPeriodo] = useState(item?.justificativaPeriodo ?? '');
  const [metaAtendida, setMetaAtendida] = useState(item?.metaAtendida ?? true);
  const [justMeta, setJustMeta] = useState(item?.justificativaMeta ?? '');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const programa = useMemo(() => programas.find((p) => p.nome === nomePrograma), [programas, nomePrograma]);
  const metas = programa?.metas ?? [];
  const meta = metas.find((m) => m.codigoMeta === codigoMeta);
  // Se a meta não estiver mais no ajuste (editando registro antigo), infere pelo dado salvo.
  const quantificavel = meta ? meta.quantificavel : item ? item.quantidadeRealizada != null : true;

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!nomePrograma) return setErro('Selecione o programa.');
    if (!codigoMeta) return setErro('Selecione a meta.');
    const per = Number(apenasDigitos(periodo));
    if (!per || per < 1 || per > 15) return setErro('Período inválido (1 a 15).');
    if (quantificavel && quantidade.trim() === '') return setErro('Informe a quantidade realizada.');
    if (!metaAtendida && !justMeta.trim()) return setErro('Justifique quando a meta não for atendida.');

    const payload: AfericaoMetaPayload = {
      nomePrograma,
      codigoMeta,
      periodo: per,
      quantidadeRealizada: quantificavel ? Number(quantidade.replace(',', '.')) : null,
      resultadoMeta: quantificavel ? null : resultado,
      justificativaPeriodo: justPeriodo.trim() || null,
      metaAtendida,
      justificativaMeta: metaAtendida ? null : justMeta.trim(),
    };
    setSalvando(true);
    try {
      if (item) await afericoesApi.atualizar(prestacaoId, item.id, payload);
      else await afericoesApi.criar(prestacaoId, payload);
      onSuccess();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível salvar a aferição.'));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={submeter} className="space-y-4">
      {erro && <AlertaErro msg={erro} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label="Programa *"
          name="nomePrograma"
          value={nomePrograma}
          onChange={(e) => { setNomePrograma(e.target.value); setCodigoMeta(''); }}
          options={programas.map((p) => ({ value: p.nome, label: p.nome }))}
        />
        <Select
          label="Meta *"
          name="codigoMeta"
          value={codigoMeta}
          onChange={(e) => setCodigoMeta(e.target.value)}
          options={metas.map((m) => ({ value: m.codigoMeta, label: `${m.codigoMeta}${m.descricao ? ` — ${m.descricao}` : ''}` }))}
          placeholder="Selecione a meta"
        />
        <Input label="Período (1–15) *" name="periodo" value={apenasDigitos(periodo).slice(0, 2)} onChange={(e) => setPeriodo(e.target.value)} inputMode="numeric" hint="Conforme a periodicidade da meta." />
        {quantificavel ? (
          <Input label="Quantidade Realizada *" name="quantidade" value={quantidade} onChange={(e) => setQuantidade(e.target.value.replace(/[^\d.,]/g, ''))} inputMode="decimal" />
        ) : (
          <Select label="Resultado da Meta *" name="resultado" value={resultado} onChange={(e) => setResultado(e.target.value as ResultadoMeta)} options={RESULTADOS} />
        )}
        <div className="sm:col-span-2">
          <Input label="Justificativa do período" name="justPeriodo" value={justPeriodo} onChange={(e) => setJustPeriodo(e.target.value)} hint="Exigida se houver divergência (quantitativa) ou resultado não cumprido (qualitativa)." />
        </div>
      </div>

      <div className="rounded-xl border border-ink-200/70 p-3 dark:border-ink-800/70">
        <label className="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-200">
          <input type="checkbox" checked={metaAtendida} onChange={(e) => setMetaAtendida(e.target.checked)} className="h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-400 dark:border-ink-600 dark:bg-ink-800" />
          Meta atendida (a atividade se compatibiliza com a meta proposta)
        </label>
        {!metaAtendida && (
          <div className="mt-3">
            <Input label="Justificativa da meta não atendida *" name="justMeta" value={justMeta} onChange={(e) => setJustMeta(e.target.value)} />
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={salvando}>Cancelar</Button>
        <Button type="submit" disabled={salvando}>{salvando && <Loader2 className="h-4 w-4 animate-spin" />}{salvando ? 'Salvando...' : 'Salvar'}</Button>
      </div>
    </form>
  );
}
