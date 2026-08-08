import { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { apenasDigitos, dataBr, mascaraCpfCnpj, mascaraMoeda, moedaParaNumero, numeroParaMascaraMoeda } from '@/lib/masks';
import { MESES } from '@/lib/dominios';
import { ONUS_PAGAMENTO } from '@/lib/dominiosFaseV';
import { isCpfValido } from '@/lib/validators';
import { extrairCodigoErro, extrairMensagemErro } from '@/services/http';
import { servidoresApi } from '@/services/prestacaoBlocos2.service';
import type { ServidorPrestacao, ServidorPrestacaoPayload } from '@/types/prestacaoBlocos5';
import { ConfirmarExclusao } from '@/pages/Ajustes/tabs/TermosAditivosTab';
import { AlertaErro, IconBtn } from './_ui';



type ModalState = { tipo: 'fechado' } | { tipo: 'form'; item: ServidorPrestacao | null } | { tipo: 'excluir'; item: ServidorPrestacao };
type LinhaPeriodo = { mes: string; carga: string; remun: string };

export function ServidoresCedidosTab({ prestacaoId }: { prestacaoId: string }) {
  const [lista, setLista] = useState<ServidorPrestacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ tipo: 'fechado' });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    servidoresApi
      .listar(prestacaoId)
      .then((r) => vivo && setLista(r))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Falha ao carregar os servidores.')))
      .finally(() => vivo && setCarregando(false));
    return () => { vivo = false; };
  }, [prestacaoId, refreshKey]);

  const recarregar = () => { setModal({ tipo: 'fechado' }); setRefreshKey((k) => k + 1); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500 dark:text-ink-400">Servidores do órgão concessor cedidos à entidade (não se aplica a Colaboração/Fomento).</p>
        <Button size="sm" onClick={() => setModal({ tipo: 'form', item: null })}><Plus className="h-4 w-4" />Adicionar</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink-200/70 dark:border-ink-800/70">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-xs font-semibold text-ink-500 dark:border-ink-800 dark:text-ink-400">
              <th className="px-4 py-2.5">CPF</th>
              <th className="px-4 py-2.5">Cargo público</th>
              <th className="px-4 py-2.5">Cessão</th>
              <th className="px-4 py-2.5 text-center">Períodos</th>
              <th className="px-4 py-2.5 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
            {carregando ? (
              <tr><td colSpan={5} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-brand-500" /></td></tr>
            ) : erro ? (
              <tr><td colSpan={5} className="py-10 text-center text-sm text-red-500">{erro}</td></tr>
            ) : lista.length === 0 ? (
              <tr><td colSpan={5} className="py-10 text-center text-sm text-ink-400">Nenhum servidor cedido cadastrado.</td></tr>
            ) : (
              lista.map((s) => (
                <tr key={s.id} className="hover:bg-ink-50/70 dark:hover:bg-ink-800/40">
                  <td className="px-4 py-2.5 font-mono text-xs text-ink-800 dark:text-ink-100">{mascaraCpfCnpj(s.cpf)}</td>
                  <td className="px-4 py-2.5 text-ink-600 dark:text-ink-300" title={s.cargoPublico}>{s.cargoPublico}</td>
                  <td className="px-4 py-2.5 text-ink-600 dark:text-ink-300">{dataBr(s.dataInicialCessao)} — {s.dataFinalCessao ? dataBr(s.dataFinalCessao) : 'em curso'}</td>
                  <td className="px-4 py-2.5 text-center text-ink-500 dark:text-ink-400">{s.periodos.length}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      <IconBtn title="Editar" onClick={() => setModal({ tipo: 'form', item: s })}><Pencil className="h-4 w-4" /></IconBtn>
                      <IconBtn title="Excluir" danger onClick={() => setModal({ tipo: 'excluir', item: s })}><Trash2 className="h-4 w-4" /></IconBtn>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modal.tipo === 'form'} onClose={() => setModal({ tipo: 'fechado' })} title={modal.tipo === 'form' && modal.item ? 'Editar Servidor Cedido' : 'Novo Servidor Cedido'} size="2xl">
        {modal.tipo === 'form' && <ServForm prestacaoId={prestacaoId} item={modal.item} onSuccess={recarregar} onCancel={() => setModal({ tipo: 'fechado' })} />}
      </Modal>
      <ConfirmarExclusao
        aberto={modal.tipo === 'excluir'}
        rotulo={modal.tipo === 'excluir' ? `o servidor ${mascaraCpfCnpj(modal.item.cpf)}` : ''}
        onCancel={() => setModal({ tipo: 'fechado' })}
        onConfirm={async () => { if (modal.tipo !== 'excluir') return; await servidoresApi.excluir(prestacaoId, modal.item.id); recarregar(); }}
      />
    </div>
  );
}

function ServForm({ prestacaoId, item, onSuccess, onCancel }: { prestacaoId: string; item: ServidorPrestacao | null; onSuccess: () => void; onCancel: () => void }) {
  const [cpf, setCpf] = useState(item?.cpf ?? '');
  const [dataInicial, setDataInicial] = useState(item?.dataInicialCessao ?? '');
  const [dataFinal, setDataFinal] = useState(item?.dataFinalCessao ?? '');
  const [cargo, setCargo] = useState(item?.cargoPublico ?? '');
  const [funcao, setFuncao] = useState(item?.funcaoEntidade ?? '');
  const [onus, setOnus] = useState(item ? String(item.onusPagamento) : '1');
  const [periodos, setPeriodos] = useState<LinhaPeriodo[]>(
    item ? item.periodos.map((p) => ({ mes: String(p.mes), carga: String(p.cargaHoraria), remun: numeroParaMascaraMoeda(p.remuneracaoBruta) })) : [],
  );
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const addPeriodo = () => setPeriodos((ps) => [...ps, { mes: '1', carga: '', remun: '' }]);
  const rmPeriodo = (i: number) => setPeriodos((ps) => ps.filter((_, idx) => idx !== i));
  const setPeriodo = (i: number, campo: keyof LinhaPeriodo, valor: string) =>
    setPeriodos((ps) => ps.map((p, idx) => (idx === i ? { ...p, [campo]: valor } : p)));

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!isCpfValido(cpf)) return setErro('CPF inválido.');
    if (!dataInicial) return setErro('Informe a data inicial da cessão.');
    if (dataFinal && dataFinal < dataInicial) return setErro('A data final não pode ser anterior à inicial.');
    if (!cargo.trim()) return setErro('Informe o cargo público.');
    if (!funcao.trim()) return setErro('Informe a função na entidade.');

    const payload: ServidorPrestacaoPayload = {
      cpf: apenasDigitos(cpf),
      dataInicialCessao: dataInicial,
      dataFinalCessao: dataFinal || null,
      cargoPublico: cargo.trim(),
      funcaoEntidade: funcao.trim(),
      onusPagamento: Number(onus),
      periodos: periodos.map((p) => ({ mes: Number(p.mes), cargaHoraria: Number(apenasDigitos(p.carga)) || 0, remuneracaoBruta: moedaParaNumero(p.remun) })),
    };
    setSalvando(true);
    try {
      if (item) await servidoresApi.atualizar(prestacaoId, item.id, payload);
      else await servidoresApi.criar(prestacaoId, payload);
      onSuccess();
    } catch (e) {
      const cod = extrairCodigoErro(e);
      setErro(extrairMensagemErro(e, cod === 'SERVIDOR_DUPLICADO' ? 'Já existe um servidor com este CPF e data inicial.' : 'Não foi possível salvar.'));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={submeter} className="space-y-5">
      {erro && <AlertaErro msg={erro} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="CPF *" name="cpf" value={mascaraCpfCnpj(cpf)} onChange={(e) => setCpf(e.target.value)} inputMode="numeric" />
        <Select label="Ônus do Pagamento *" name="onus" value={onus} onChange={(e) => setOnus(e.target.value)} options={ONUS_PAGAMENTO} />
        <Input label="Início da Cessão *" name="dataInicial" type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} />
        <Input label="Fim da Cessão" name="dataFinal" type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} hint="Em branco = ainda em curso." />
        <Input label="Cargo Público *" name="cargo" value={cargo} onChange={(e) => setCargo(e.target.value)} />
        <Input label="Função na Entidade *" name="funcao" value={funcao} onChange={(e) => setFuncao(e.target.value)} />
      </div>

      <div className="rounded-xl border border-ink-200/70 p-3 dark:border-ink-800/70">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-ink-700 dark:text-ink-200">Períodos de cessão</p>
          <Button type="button" variant="secondary" size="sm" onClick={addPeriodo}><Plus className="h-4 w-4" />Período</Button>
        </div>
        {periodos.length === 0 ? (
          <p className="py-2 text-xs text-ink-400">Nenhum período. Use “+ Período” para adicionar mês, carga horária e remuneração.</p>
        ) : (
          <div className="space-y-2">
            {periodos.map((p, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
                <Select label={i === 0 ? 'Mês' : undefined} name={`mes-${i}`} value={p.mes} onChange={(e) => setPeriodo(i, 'mes', e.target.value)} options={MESES} />
                <Input label={i === 0 ? 'Carga (h)' : undefined} name={`carga-${i}`} value={apenasDigitos(p.carga)} onChange={(e) => setPeriodo(i, 'carga', e.target.value)} inputMode="numeric" placeholder="ex.: 40" />
                <Input label={i === 0 ? 'Remuneração (R$)' : undefined} name={`remun-${i}`} value={p.remun} onChange={(e) => setPeriodo(i, 'remun', mascaraMoeda(e.target.value))} placeholder="0,00" inputMode="numeric" />
                <IconBtn title="Remover período" danger onClick={() => rmPeriodo(i)}><X className="h-4 w-4" /></IconBtn>
              </div>
            ))}
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
