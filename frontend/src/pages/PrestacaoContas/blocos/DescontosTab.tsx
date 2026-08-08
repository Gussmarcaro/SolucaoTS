import { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { dataBr, formatarMoeda, mascaraMoeda, moedaParaNumero, numeroParaMascaraMoeda } from '@/lib/masks';
import { extrairMensagemErro } from '@/services/http';
import { descontosApi } from '@/services/prestacaoBlocos2.service';
import type { Desconto, DescontoPayload } from '@/types/prestacaoBlocos2';
import { ConfirmarExclusao } from '@/pages/Ajustes/tabs/TermosAditivosTab';
import { AlertaErro, IconBtn } from './_ui';

type ModalState = { tipo: 'fechado' } | { tipo: 'form'; item: Desconto | null } | { tipo: 'excluir'; item: Desconto };

export function DescontosTab({ prestacaoId }: { prestacaoId: string }) {
  const [lista, setLista] = useState<Desconto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ tipo: 'fechado' });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    descontosApi
      .listar(prestacaoId)
      .then((r) => vivo && setLista(r))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Falha ao carregar os descontos.')))
      .finally(() => vivo && setCarregando(false));
    return () => { vivo = false; };
  }, [prestacaoId, refreshKey]);

  const recarregar = () => { setModal({ tipo: 'fechado' }); setRefreshKey((k) => k + 1); };
  const total = lista.reduce((s, i) => s + i.valor, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500 dark:text-ink-400">
          {lista.length > 0 ? `${lista.length} desconto(s) · total ${formatarMoeda(total)}` : 'Deduções por descumprimento de metas.'}
        </p>
        <Button size="sm" onClick={() => setModal({ tipo: 'form', item: null })}><Plus className="h-4 w-4" />Adicionar</Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-ink-200/70 dark:border-ink-800/70">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-ink-100 text-xs font-semibold text-ink-500 dark:border-ink-800 dark:text-ink-400">
              <th className="px-4 py-2">Data</th>
              <th className="px-4 py-2">Descrição</th>
              <th className="px-4 py-2 text-right">Valor</th>
              <th className="px-4 py-2 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
            {carregando ? (
              <tr><td colSpan={4} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-brand-500" /></td></tr>
            ) : erro ? (
              <tr><td colSpan={4} className="py-10 text-center text-sm text-red-500">{erro}</td></tr>
            ) : lista.length === 0 ? (
              <tr><td colSpan={4} className="py-10 text-center text-sm text-ink-400">Nenhum desconto cadastrado.</td></tr>
            ) : (
              lista.map((i) => (
                <tr key={i.id} className="hover:bg-ink-50/70 dark:hover:bg-ink-800/40">
                  <td className="px-4 py-2 text-ink-600 dark:text-ink-300">{dataBr(i.data)}</td>
                  <td className="px-4 py-2 text-ink-700 dark:text-ink-200">{i.descricao}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-ink-700 dark:text-ink-200">{formatarMoeda(i.valor)}</td>
                  <td className="px-4 py-2">
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

      <Modal open={modal.tipo === 'form'} onClose={() => setModal({ tipo: 'fechado' })} title={modal.tipo === 'form' && modal.item ? 'Editar Desconto' : 'Novo Desconto'} size="md">
        {modal.tipo === 'form' && <DescForm prestacaoId={prestacaoId} item={modal.item} onSuccess={recarregar} onCancel={() => setModal({ tipo: 'fechado' })} />}
      </Modal>
      <ConfirmarExclusao
        aberto={modal.tipo === 'excluir'}
        rotulo="este desconto"
        onCancel={() => setModal({ tipo: 'fechado' })}
        onConfirm={async () => { if (modal.tipo !== 'excluir') return; await descontosApi.excluir(prestacaoId, modal.item.id); recarregar(); }}
      />
    </div>
  );
}

function DescForm({ prestacaoId, item, onSuccess, onCancel }: { prestacaoId: string; item: Desconto | null; onSuccess: () => void; onCancel: () => void }) {
  const [data, setData] = useState(item?.data ?? '');
  const [descricao, setDescricao] = useState(item?.descricao ?? '');
  const [valor, setValor] = useState(item ? numeroParaMascaraMoeda(item.valor) : '');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!data) return setErro('Informe a data.');
    if (!descricao.trim()) return setErro('Informe a descrição.');
    if (moedaParaNumero(valor) <= 0) return setErro('Informe o valor.');
    const payload: DescontoPayload = { data, descricao: descricao.trim(), valor: moedaParaNumero(valor) };
    setSalvando(true);
    try {
      if (item) await descontosApi.atualizar(prestacaoId, item.id, payload);
      else await descontosApi.criar(prestacaoId, payload);
      onSuccess();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível salvar.'));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={submeter} className="space-y-4">
      {erro && <AlertaErro msg={erro} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Data *" name="data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
        <Input label="Valor (R$) *" name="valor" value={valor} onChange={(e) => setValor(mascaraMoeda(e.target.value))} placeholder="0,00" inputMode="numeric" />
        <div className="sm:col-span-2">
          <Input label="Descrição *" name="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={salvando}>Cancelar</Button>
        <Button type="submit" disabled={salvando}>{salvando && <Loader2 className="h-4 w-4 animate-spin" />}{salvando ? 'Salvando...' : 'Salvar'}</Button>
      </div>
    </form>
  );
}
