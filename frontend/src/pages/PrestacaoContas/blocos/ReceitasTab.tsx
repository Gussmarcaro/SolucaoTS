import { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { SelectDominio } from '@/components/ui/SelectDominio';
import { FONTE_RECURSO } from '@/lib/dominiosFaseV';
import { apenasDigitos, dataBr, formatarMoeda, mascaraMoeda, moedaParaNumero, numeroParaMascaraMoeda } from '@/lib/masks';
import { extrairMensagemErro } from '@/services/http';
import { receitasApi } from '@/services/prestacaoBlocos2.service';
import { RECEITA_TIPO_LABEL, ehAplicacaoFinanceira, type Receita, type ReceitaPayload, type ReceitaTipo } from '@/types/prestacaoBlocos2';
import { ConfirmarExclusao } from '@/pages/Ajustes/tabs/TermosAditivosTab';
import { AlertaErro, IconBtn } from './_ui';

type ModalState = { tipo: 'fechado' } | { tipo: 'form'; item: Receita | null } | { tipo: 'excluir'; item: Receita };

export function ReceitasTab({ prestacaoId }: { prestacaoId: string }) {
  const [lista, setLista] = useState<Receita[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ tipo: 'fechado' });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    receitasApi
      .listar(prestacaoId)
      .then((r) => vivo && setLista(r))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Falha ao carregar as receitas.')))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [prestacaoId, refreshKey]);

  const recarregar = () => {
    setModal({ tipo: 'fechado' });
    setRefreshKey((k) => k + 1);
  };
  const total = lista.reduce((s, i) => s + i.valor, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500 dark:text-ink-400">
          {lista.length > 0 ? `${lista.length} receita(s) · total ${formatarMoeda(total)}` : 'Repasses, aplicações financeiras e outras receitas.'}
        </p>
        <Button size="sm" onClick={() => setModal({ tipo: 'form', item: null })}><Plus className="h-4 w-4" />Adicionar</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink-200/70 dark:border-ink-800/70">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-xs font-semibold text-ink-500 dark:border-ink-800 dark:text-ink-400">
              <th className="px-4 py-2.5">Tipo</th>
              <th className="px-4 py-2.5">Repasse</th>
              <th className="px-4 py-2.5">Descrição</th>
              <th className="px-4 py-2.5 text-right">Valor</th>
              <th className="px-4 py-2.5 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
            {carregando ? (
              <tr><td colSpan={5} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-brand-500" /></td></tr>
            ) : erro ? (
              <tr><td colSpan={5} className="py-10 text-center text-sm text-red-500">{erro}</td></tr>
            ) : lista.length === 0 ? (
              <tr><td colSpan={5} className="py-10 text-center text-sm text-ink-400">Nenhuma receita cadastrada.</td></tr>
            ) : (
              lista.map((i) => (
                <tr key={i.id} className="hover:bg-ink-50/70 dark:hover:bg-ink-800/40">
                  <td className="px-4 py-2.5 text-ink-700 dark:text-ink-200">{RECEITA_TIPO_LABEL[i.tipo]}</td>
                  <td className="px-4 py-2.5 text-ink-600 dark:text-ink-300">{i.dataRepasse ? dataBr(i.dataRepasse) : '—'}</td>
                  <td className="px-4 py-2.5 text-ink-500 dark:text-ink-400">{i.descricao ?? '—'}</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums ${i.valor < 0 ? 'text-red-500' : 'text-ink-700 dark:text-ink-200'}`}>{formatarMoeda(i.valor)}</td>
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

      <Modal open={modal.tipo === 'form'} onClose={() => setModal({ tipo: 'fechado' })} title={modal.tipo === 'form' && modal.item ? 'Editar Receita' : 'Nova Receita'} size="lg">
        {modal.tipo === 'form' && <ReceitaForm prestacaoId={prestacaoId} item={modal.item} onSuccess={recarregar} onCancel={() => setModal({ tipo: 'fechado' })} />}
      </Modal>
      <ConfirmarExclusao
        aberto={modal.tipo === 'excluir'}
        rotulo="esta receita"
        onCancel={() => setModal({ tipo: 'fechado' })}
        onConfirm={async () => { if (modal.tipo !== 'excluir') return; await receitasApi.excluir(prestacaoId, modal.item.id); recarregar(); }}
      />
    </div>
  );
}

function ReceitaForm({ prestacaoId, item, onSuccess, onCancel }: { prestacaoId: string; item: Receita | null; onSuccess: () => void; onCancel: () => void }) {
  const [tipo, setTipo] = useState<ReceitaTipo>(item?.tipo ?? 'REPASSE_RECEBIDO');
  const [valor, setValor] = useState(item ? numeroParaMascaraMoeda(Math.abs(item.valor)) : '');
  const [negativo, setNegativo] = useState(item ? item.valor < 0 : false);
  const [dataRepasse, setDataRepasse] = useState(item?.dataRepasse ?? '');
  const [dataPrevista, setDataPrevista] = useState(item?.dataPrevista ?? '');
  const [fonte, setFonte] = useState(item?.fonteRecursoTipo != null ? String(item.fonteRecursoTipo) : '');
  const [descricao, setDescricao] = useState(item?.descricao ?? '');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const mag = moedaParaNumero(valor);
    if (mag <= 0) return setErro('Informe o valor.');
    const payload: ReceitaPayload = {
      tipo,
      descricao: descricao.trim() || null,
      dataPrevista: dataPrevista || null,
      dataRepasse: dataRepasse || null,
      fonteRecursoTipo: fonte ? Number(apenasDigitos(fonte)) : null,
      valor: negativo ? -mag : mag,
    };
    setSalvando(true);
    try {
      if (item) await receitasApi.atualizar(prestacaoId, item.id, payload);
      else await receitasApi.criar(prestacaoId, payload);
      onSuccess();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível salvar a receita.'));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={submeter} className="space-y-4">
      {erro && <AlertaErro msg={erro} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select label="Tipo *" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as ReceitaTipo)} options={(Object.keys(RECEITA_TIPO_LABEL) as ReceitaTipo[]).map((t) => ({ value: t, label: RECEITA_TIPO_LABEL[t] }))} />
        <Input label="Valor (R$) *" name="valor" value={valor} onChange={(e) => setValor(mascaraMoeda(e.target.value))} placeholder="0,00" inputMode="numeric" />
        <Input label="Data do Repasse" name="dataRepasse" type="date" value={dataRepasse} onChange={(e) => setDataRepasse(e.target.value)} />
        <Input label="Data Prevista" name="dataPrevista" type="date" value={dataPrevista} onChange={(e) => setDataPrevista(e.target.value)} />
        <SelectDominio label="Fonte de Recurso" name="fonte" value={apenasDigitos(fonte)} onChange={setFonte} options={FONTE_RECURSO} />
        <div className="sm:col-span-2">
          <Input label="Descrição" name="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>
        {ehAplicacaoFinanceira(tipo) && (
          <label className="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-200">
            <input type="checkbox" checked={negativo} onChange={(e) => setNegativo(e.target.checked)} className="h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-400 dark:border-ink-600 dark:bg-ink-800" />
            Valor negativo (resgate/perda)
          </label>
        )}
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={salvando}>Cancelar</Button>
        <Button type="submit" disabled={salvando}>{salvando && <Loader2 className="h-4 w-4 animate-spin" />}{salvando ? 'Salvando...' : 'Salvar'}</Button>
      </div>
    </form>
  );
}
