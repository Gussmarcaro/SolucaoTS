import { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { apenasDigitos, dataBr, formatarMoeda, mascaraMoeda, moedaParaNumero, numeroParaMascaraMoeda } from '@/lib/masks';
import { extrairMensagemErro } from '@/services/http';
import { empenhosApi, repassesApi } from '@/services/prestacaoBlocos2.service';
import type { EmpenhoPrestacao, Repasse, RepassePayload } from '@/types/prestacaoBlocos4';
import { ConfirmarExclusao } from '@/pages/Ajustes/tabs/TermosAditivosTab';
import { AlertaErro, IconBtn } from './_ui';

const SEM = 'nenhum';
type ModalState = { tipo: 'fechado' } | { tipo: 'form'; item: Repasse | null } | { tipo: 'excluir'; item: Repasse };

export function RepassesTab({ prestacaoId }: { prestacaoId: string }) {
  const [lista, setLista] = useState<Repasse[]>([]);
  const [empenhos, setEmpenhos] = useState<EmpenhoPrestacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ tipo: 'fechado' });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    Promise.all([repassesApi.listar(prestacaoId), empenhosApi.listar(prestacaoId)])
      .then(([rs, es]) => { if (!vivo) return; setLista(rs); setEmpenhos(es); })
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Falha ao carregar os repasses.')))
      .finally(() => vivo && setCarregando(false));
    return () => { vivo = false; };
  }, [prestacaoId, refreshKey]);

  const recarregar = () => { setModal({ tipo: 'fechado' }); setRefreshKey((k) => k + 1); };
  const total = lista.reduce((s, i) => s + i.valorRepasse, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500 dark:text-ink-400">
          {lista.length > 0 ? `${lista.length} repasse(s) · total ${formatarMoeda(total)}` : 'Repasses recebidos, vinculados aos empenhos.'}
        </p>
        <Button size="sm" onClick={() => setModal({ tipo: 'form', item: null })}><Plus className="h-4 w-4" />Adicionar</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink-200/70 dark:border-ink-800/70">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-xs font-semibold text-ink-500 dark:border-ink-800 dark:text-ink-400">
              <th className="px-4 py-2.5">Empenho</th>
              <th className="px-4 py-2.5">Repasse</th>
              <th className="px-4 py-2.5 text-right">Previsto</th>
              <th className="px-4 py-2.5 text-right">Repassado</th>
              <th className="px-4 py-2.5 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
            {carregando ? (
              <tr><td colSpan={5} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-brand-500" /></td></tr>
            ) : erro ? (
              <tr><td colSpan={5} className="py-10 text-center text-sm text-red-500">{erro}</td></tr>
            ) : lista.length === 0 ? (
              <tr><td colSpan={5} className="py-10 text-center text-sm text-ink-400">Nenhum repasse cadastrado.</td></tr>
            ) : (
              lista.map((i) => (
                <tr key={i.id} className="hover:bg-ink-50/70 dark:hover:bg-ink-800/40">
                  <td className="px-4 py-2.5 text-ink-700 dark:text-ink-200">
                    {i.empenhoNumero ? <span className="font-mono text-xs">Nº {i.empenhoNumero}</span> : <Badge tone="neutral">sem vínculo</Badge>}
                  </td>
                  <td className="px-4 py-2.5 text-ink-600 dark:text-ink-300">{dataBr(i.dataRepasse)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-ink-500 dark:text-ink-400">{formatarMoeda(i.valorPrevisto)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-ink-700 dark:text-ink-200">{formatarMoeda(i.valorRepasse)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      <IconBtn title="Editar" onClick={() => setModal({ tipo: 'form', item: i })}><Pencil className="h-4 w-4" /></IconBtn>
                      <IconBtn title="Excluir" danger onClick={() => setModal({ tipo: 'excluir', item: i })}><Trash2 className="h-4 w-4" /></IconBtn>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modal.tipo === 'form'} onClose={() => setModal({ tipo: 'fechado' })} title={modal.tipo === 'form' && modal.item ? 'Editar Repasse' : 'Novo Repasse'} size="lg">
        {modal.tipo === 'form' && <RepasseForm prestacaoId={prestacaoId} item={modal.item} empenhos={empenhos} onSuccess={recarregar} onCancel={() => setModal({ tipo: 'fechado' })} />}
      </Modal>
      <ConfirmarExclusao
        aberto={modal.tipo === 'excluir'}
        rotulo="este repasse"
        onCancel={() => setModal({ tipo: 'fechado' })}
        onConfirm={async () => { if (modal.tipo !== 'excluir') return; await repassesApi.excluir(prestacaoId, modal.item.id); recarregar(); }}
      />
    </div>
  );
}

function RepasseForm({ prestacaoId, item, empenhos, onSuccess, onCancel }: { prestacaoId: string; item: Repasse | null; empenhos: EmpenhoPrestacao[]; onSuccess: () => void; onCancel: () => void }) {
  const [empenhoId, setEmpenhoId] = useState(item ? (item.empenhoId ?? SEM) : (empenhos[0]?.id ?? SEM));
  const [dataPrevista, setDataPrevista] = useState(item?.dataPrevista ?? '');
  const [dataRepasse, setDataRepasse] = useState(item?.dataRepasse ?? '');
  const [valorPrevisto, setValorPrevisto] = useState(item ? numeroParaMascaraMoeda(item.valorPrevisto) : '');
  const [valorRepasse, setValorRepasse] = useState(item ? numeroParaMascaraMoeda(item.valorRepasse) : '');
  const [justificativa, setJustificativa] = useState(item?.justificativaDiferenca ?? '');
  const [banco, setBanco] = useState(item?.banco != null ? String(item.banco) : '');
  const [agencia, setAgencia] = useState(item?.agencia != null ? String(item.agencia) : '');
  const [conta, setConta] = useState(item?.conta ?? '');
  const [numeroDoc, setNumeroDoc] = useState(item?.numeroDocumento ?? '');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const difere = moedaParaNumero(valorPrevisto) !== moedaParaNumero(valorRepasse);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!dataPrevista) return setErro('Informe a data prevista.');
    if (!dataRepasse) return setErro('Informe a data do repasse.');
    if (moedaParaNumero(valorRepasse) <= 0) return setErro('Informe o valor repassado.');
    if (difere && !justificativa.trim()) return setErro('Previsto difere do repassado: informe a justificativa.');

    const payload: RepassePayload = {
      empenhoId: empenhoId === SEM ? null : empenhoId,
      dataPrevista,
      dataRepasse,
      valorPrevisto: moedaParaNumero(valorPrevisto),
      valorRepasse: moedaParaNumero(valorRepasse),
      justificativaDiferenca: difere ? justificativa.trim() : null,
      numeroDocumento: numeroDoc.trim() || null,
      banco: banco ? Number(apenasDigitos(banco)) : null,
      agencia: agencia ? Number(apenasDigitos(agencia)) : null,
      conta: conta.trim() || null,
    };
    setSalvando(true);
    try {
      if (item) await repassesApi.atualizar(prestacaoId, item.id, payload);
      else await repassesApi.criar(prestacaoId, payload);
      onSuccess();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível salvar o repasse.'));
    } finally {
      setSalvando(false);
    }
  }

  const opcoesEmpenho = [
    { value: SEM, label: 'Sem vínculo' },
    ...empenhos.map((e) => ({ value: e.id, label: `Nº ${e.numero} — ${formatarMoeda(e.valor)}` })),
  ];

  return (
    <form onSubmit={submeter} className="space-y-4">
      {erro && <AlertaErro msg={erro} />}
      <Select label="Empenho" name="empenhoId" value={empenhoId} onChange={(e) => setEmpenhoId(e.target.value)} options={opcoesEmpenho} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Data Prevista *" name="dataPrevista" type="date" value={dataPrevista} onChange={(e) => setDataPrevista(e.target.value)} />
        <Input label="Data do Repasse *" name="dataRepasse" type="date" value={dataRepasse} onChange={(e) => setDataRepasse(e.target.value)} />
        <Input label="Valor Previsto (R$)" name="valorPrevisto" value={valorPrevisto} onChange={(e) => setValorPrevisto(mascaraMoeda(e.target.value))} placeholder="0,00" inputMode="numeric" />
        <Input label="Valor Repassado (R$) *" name="valorRepasse" value={valorRepasse} onChange={(e) => setValorRepasse(mascaraMoeda(e.target.value))} placeholder="0,00" inputMode="numeric" />
      </div>
      {difere && (
        <Input label="Justificativa da diferença *" name="justificativa" value={justificativa} onChange={(e) => setJustificativa(e.target.value)} hint="Obrigatória quando o previsto difere do repassado." />
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Input label="Nº Documento" name="numeroDoc" value={numeroDoc} onChange={(e) => setNumeroDoc(e.target.value)} />
        <Input label="Banco" name="banco" value={apenasDigitos(banco)} onChange={(e) => setBanco(e.target.value)} inputMode="numeric" />
        <Input label="Agência" name="agencia" value={apenasDigitos(agencia)} onChange={(e) => setAgencia(e.target.value)} inputMode="numeric" />
        <Input label="Conta" name="conta" value={conta} onChange={(e) => setConta(e.target.value)} />
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={salvando}>Cancelar</Button>
        <Button type="submit" disabled={salvando}>{salvando && <Loader2 className="h-4 w-4 animate-spin" />}{salvando ? 'Salvando...' : 'Salvar'}</Button>
      </div>
    </form>
  );
}
