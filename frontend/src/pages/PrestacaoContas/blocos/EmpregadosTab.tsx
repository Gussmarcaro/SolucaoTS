import { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { apenasDigitos, dataBr, formatarMoeda, mascaraCpfCnpj, mascaraMoeda, moedaParaNumero, numeroParaMascaraMoeda } from '@/lib/masks';
import { MESES, ehMedico } from '@/lib/dominios';
import { isCpfValido } from '@/lib/validators';
import { extrairCodigoErro, extrairMensagemErro } from '@/services/http';
import { empregadosApi } from '@/services/prestacaoBlocos2.service';
import type { Empregado, EmpregadoPayload } from '@/types/prestacaoBlocos3';
import { ConfirmarExclusao } from '@/pages/Ajustes/tabs/TermosAditivosTab';
import { AlertaErro, IconBtn } from './_ui';

type ModalState = { tipo: 'fechado' } | { tipo: 'form'; item: Empregado | null } | { tipo: 'excluir'; item: Empregado };
type LinhaPeriodo = { mes: string; carga: string; remun: string };

export function EmpregadosTab({ prestacaoId }: { prestacaoId: string }) {
  const [lista, setLista] = useState<Empregado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ tipo: 'fechado' });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    empregadosApi
      .listar(prestacaoId)
      .then((r) => vivo && setLista(r))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Falha ao carregar os empregados.')))
      .finally(() => vivo && setCarregando(false));
    return () => { vivo = false; };
  }, [prestacaoId, refreshKey]);

  const recarregar = () => { setModal({ tipo: 'fechado' }); setRefreshKey((k) => k + 1); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500 dark:text-ink-400">Carga horária e remuneração referem-se à parte da parceria (§12).</p>
        <Button size="sm" onClick={() => setModal({ tipo: 'form', item: null })}><Plus className="h-4 w-4" />Adicionar</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink-200/70 dark:border-ink-800/70">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-xs font-semibold text-ink-500 dark:border-ink-800 dark:text-ink-400">
              <th className="px-4 py-2.5">CPF</th>
              <th className="px-4 py-2.5">CBO</th>
              <th className="px-4 py-2.5">Admissão</th>
              <th className="px-4 py-2.5 text-right">Salário</th>
              <th className="px-4 py-2.5 text-center">Períodos</th>
              <th className="px-4 py-2.5 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
            {carregando ? (
              <tr><td colSpan={6} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-brand-500" /></td></tr>
            ) : erro ? (
              <tr><td colSpan={6} className="py-10 text-center text-sm text-red-500">{erro}</td></tr>
            ) : lista.length === 0 ? (
              <tr><td colSpan={6} className="py-10 text-center text-sm text-ink-400">Nenhum empregado cadastrado.</td></tr>
            ) : (
              lista.map((e) => (
                <tr key={e.id} className="hover:bg-ink-50/70 dark:hover:bg-ink-800/40">
                  <td className="px-4 py-2.5 font-mono text-xs text-ink-800 dark:text-ink-100">{mascaraCpfCnpj(e.cpf)}</td>
                  <td className="px-4 py-2.5 text-ink-600 dark:text-ink-300">{e.cbo}{ehMedico(e.cbo) && <Badge tone="brand">médico</Badge>}</td>
                  <td className="px-4 py-2.5 text-ink-600 dark:text-ink-300">{dataBr(e.dataAdmissao)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-ink-700 dark:text-ink-200">{formatarMoeda(e.salarioContratual)}</td>
                  <td className="px-4 py-2.5 text-center text-ink-500 dark:text-ink-400">{e.periodos.length}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      <IconBtn title="Editar" onClick={() => setModal({ tipo: 'form', item: e })}><Pencil className="h-4 w-4" /></IconBtn>
                      <IconBtn title="Excluir" danger onClick={() => setModal({ tipo: 'excluir', item: e })}><Trash2 className="h-4 w-4" /></IconBtn>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modal.tipo === 'form'} onClose={() => setModal({ tipo: 'fechado' })} title={modal.tipo === 'form' && modal.item ? 'Editar Empregado' : 'Novo Empregado'} size="2xl">
        {modal.tipo === 'form' && <EmpForm prestacaoId={prestacaoId} item={modal.item} onSuccess={recarregar} onCancel={() => setModal({ tipo: 'fechado' })} />}
      </Modal>
      <ConfirmarExclusao
        aberto={modal.tipo === 'excluir'}
        rotulo={modal.tipo === 'excluir' ? `o empregado ${mascaraCpfCnpj(modal.item.cpf)}` : ''}
        onCancel={() => setModal({ tipo: 'fechado' })}
        onConfirm={async () => { if (modal.tipo !== 'excluir') return; await empregadosApi.excluir(prestacaoId, modal.item.id); recarregar(); }}
      />
    </div>
  );
}

function EmpForm({ prestacaoId, item, onSuccess, onCancel }: { prestacaoId: string; item: Empregado | null; onSuccess: () => void; onCancel: () => void }) {
  const [cpf, setCpf] = useState(item?.cpf ?? '');
  const [dataAdmissao, setDataAdmissao] = useState(item?.dataAdmissao ?? '');
  const [dataDemissao, setDataDemissao] = useState(item?.dataDemissao ?? '');
  const [cbo, setCbo] = useState(item?.cbo ?? '');
  const [cns, setCns] = useState(item?.cns ?? '');
  const [salario, setSalario] = useState(item ? numeroParaMascaraMoeda(item.salarioContratual) : '');
  const [periodos, setPeriodos] = useState<LinhaPeriodo[]>(
    item ? item.periodos.map((p) => ({ mes: String(p.mes), carga: String(p.cargaHoraria), remun: numeroParaMascaraMoeda(p.remuneracaoBruta) })) : [],
  );
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const medico = ehMedico(cbo);

  const addPeriodo = () => setPeriodos((ps) => [...ps, { mes: '1', carga: '', remun: '' }]);
  const rmPeriodo = (i: number) => setPeriodos((ps) => ps.filter((_, idx) => idx !== i));
  const setPeriodo = (i: number, campo: keyof LinhaPeriodo, valor: string) =>
    setPeriodos((ps) => ps.map((p, idx) => (idx === i ? { ...p, [campo]: valor } : p)));

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!isCpfValido(cpf)) return setErro('CPF inválido.');
    if (!dataAdmissao) return setErro('Informe a data de admissão.');
    if (apenasDigitos(cbo).length !== 6) return setErro('CBO deve ter 6 dígitos.');
    if (medico && apenasDigitos(cns).length !== 15) return setErro('CNS (15 dígitos) é obrigatório para médicos.');
    if (moedaParaNumero(salario) <= 0) return setErro('Informe o salário contratual.');

    const payload: EmpregadoPayload = {
      cpf: apenasDigitos(cpf),
      dataAdmissao,
      dataDemissao: dataDemissao || null,
      cbo: apenasDigitos(cbo),
      cns: cns ? apenasDigitos(cns) : null,
      salarioContratual: moedaParaNumero(salario),
      periodos: periodos.map((p) => ({ mes: Number(p.mes), cargaHoraria: Number(apenasDigitos(p.carga)) || 0, remuneracaoBruta: moedaParaNumero(p.remun) })),
    };
    setSalvando(true);
    try {
      if (item) await empregadosApi.atualizar(prestacaoId, item.id, payload);
      else await empregadosApi.criar(prestacaoId, payload);
      onSuccess();
    } catch (e) {
      const cod = extrairCodigoErro(e);
      setErro(extrairMensagemErro(e, cod === 'EMPREGADO_DUPLICADO' ? 'Já existe um empregado com este CPF e admissão.' : 'Não foi possível salvar.'));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={submeter} className="space-y-5">
      {erro && <AlertaErro msg={erro} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="CPF *" name="cpf" value={mascaraCpfCnpj(cpf)} onChange={(e) => setCpf(e.target.value)} inputMode="numeric" />
        <Input label="Salário Contratual (R$) *" name="salario" value={salario} onChange={(e) => setSalario(mascaraMoeda(e.target.value))} placeholder="0,00" inputMode="numeric" />
        <Input label="Data de Admissão *" name="dataAdmissao" type="date" value={dataAdmissao} onChange={(e) => setDataAdmissao(e.target.value)} />
        <Input label="Data de Demissão" name="dataDemissao" type="date" value={dataDemissao} onChange={(e) => setDataDemissao(e.target.value)} />
        <Input label="CBO *" name="cbo" value={apenasDigitos(cbo).slice(0, 6)} onChange={(e) => setCbo(e.target.value)} placeholder="000000" inputMode="numeric" hint={medico ? 'CBO de médico — CNS obrigatório.' : undefined} />
        <Input label={`CNS${medico ? ' *' : ''}`} name="cns" value={apenasDigitos(cns).slice(0, 15)} onChange={(e) => setCns(e.target.value)} placeholder="000000000000000" inputMode="numeric" />
      </div>

      <div className="rounded-xl border border-ink-200/70 p-3 dark:border-ink-800/70">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-ink-700 dark:text-ink-200">Períodos de remuneração</p>
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
