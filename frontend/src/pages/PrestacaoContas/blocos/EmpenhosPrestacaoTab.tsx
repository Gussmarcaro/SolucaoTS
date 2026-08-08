import { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { BuscaClassificacao } from '@/components/ui/BuscaClassificacao';
import { SelectDominio } from '@/components/ui/SelectDominio';
import { FONTE_RECURSO } from '@/lib/dominiosFaseV';
import { apenasDigitos, dataBr, formatarMoeda, mascaraCpfCnpj, mascaraMoeda, moedaParaNumero, numeroParaMascaraMoeda } from '@/lib/masks';
import { isCpfValido } from '@/lib/validators';
import { extrairCodigoErro, extrairMensagemErro } from '@/services/http';
import { empenhosApi } from '@/services/prestacaoBlocos2.service';
import type { EmpenhoPrestacao, EmpenhoPrestacaoPayload } from '@/types/prestacaoBlocos4';
import { ConfirmarExclusao } from '@/pages/Ajustes/tabs/TermosAditivosTab';
import { AlertaErro, IconBtn } from './_ui';

type ModalState = { tipo: 'fechado' } | { tipo: 'form'; item: EmpenhoPrestacao | null } | { tipo: 'excluir'; item: EmpenhoPrestacao };

export function EmpenhosPrestacaoTab({ prestacaoId }: { prestacaoId: string }) {
  const [lista, setLista] = useState<EmpenhoPrestacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ tipo: 'fechado' });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    empenhosApi
      .listar(prestacaoId)
      .then((r) => vivo && setLista(r))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Falha ao carregar os empenhos.')))
      .finally(() => vivo && setCarregando(false));
    return () => { vivo = false; };
  }, [prestacaoId, refreshKey]);

  const recarregar = () => { setModal({ tipo: 'fechado' }); setRefreshKey((k) => k + 1); };
  const total = lista.reduce((s, i) => s + i.valor, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500 dark:text-ink-400">
          {lista.length > 0 ? `${lista.length} empenho(s) · total ${formatarMoeda(total)}` : 'Empenhos do exercício (dão suporte orçamentário aos repasses).'}
        </p>
        <Button size="sm" onClick={() => setModal({ tipo: 'form', item: null })}><Plus className="h-4 w-4" />Adicionar</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink-200/70 dark:border-ink-800/70">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-xs font-semibold text-ink-500 dark:border-ink-800 dark:text-ink-400">
              <th className="px-4 py-2.5">Número</th>
              <th className="px-4 py-2.5">Emissão</th>
              <th className="px-4 py-2.5">Classif. econômica</th>
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
              <tr><td colSpan={5} className="py-10 text-center text-sm text-ink-400">Nenhum empenho cadastrado.</td></tr>
            ) : (
              lista.map((i) => (
                <tr key={i.id} className="hover:bg-ink-50/70 dark:hover:bg-ink-800/40">
                  <td className="px-4 py-2.5 font-mono text-xs text-ink-800 dark:text-ink-100">{i.numero}</td>
                  <td className="px-4 py-2.5 text-ink-600 dark:text-ink-300">{dataBr(i.dataEmissao)}</td>
                  <td className="px-4 py-2.5 text-ink-600 dark:text-ink-300">{i.classificacaoEconomica}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-ink-700 dark:text-ink-200">{formatarMoeda(i.valor)}</td>
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

      <Modal open={modal.tipo === 'form'} onClose={() => setModal({ tipo: 'fechado' })} title={modal.tipo === 'form' && modal.item ? 'Editar Empenho' : 'Novo Empenho'} size="lg">
        {modal.tipo === 'form' && <EmpenhoForm prestacaoId={prestacaoId} item={modal.item} onSuccess={recarregar} onCancel={() => setModal({ tipo: 'fechado' })} />}
      </Modal>
      <ConfirmarExclusao
        aberto={modal.tipo === 'excluir'}
        rotulo={modal.tipo === 'excluir' ? `o empenho nº ${modal.item.numero}` : ''}
        onCancel={() => setModal({ tipo: 'fechado' })}
        onConfirm={async () => { if (modal.tipo !== 'excluir') return; await empenhosApi.excluir(prestacaoId, modal.item.id); recarregar(); }}
      />
    </div>
  );
}

function EmpenhoForm({ prestacaoId, item, onSuccess, onCancel }: { prestacaoId: string; item: EmpenhoPrestacao | null; onSuccess: () => void; onCancel: () => void }) {
  const [numero, setNumero] = useState(item?.numero ?? '');
  const [dataEmissao, setDataEmissao] = useState(item?.dataEmissao ?? '');
  const [classificacao, setClassificacao] = useState(item?.classificacaoEconomica ?? '');
  const [fonte, setFonte] = useState(item ? String(item.fonteRecursoTipo) : '');
  const [valor, setValor] = useState(item ? numeroParaMascaraMoeda(item.valor) : '');
  const [cpf, setCpf] = useState(item?.cpfOrdenadorDespesa ?? '');
  const [historico, setHistorico] = useState(item?.historico ?? '');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  // A classificação econômica vale por exercício (§17 #2): o do empenho é o
  // ano da emissão. Sem data ainda, a API oferece a edição mais recente.
  const exercicioEmpenho = /^\d{4}-/.test(dataEmissao) ? Number(dataEmissao.slice(0, 4)) : undefined;

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!numero.trim()) return setErro('Informe o número do empenho.');
    if (!dataEmissao) return setErro('Informe a data de emissão.');
    if (!classificacao.trim()) return setErro('Informe a classificação econômica.');
    if (!fonte.trim()) return setErro('Informe a fonte de recurso.');
    if (moedaParaNumero(valor) <= 0) return setErro('Informe o valor.');
    if (!isCpfValido(cpf)) return setErro('CPF do ordenador inválido.');

    const payload: EmpenhoPrestacaoPayload = {
      numero: numero.trim(),
      dataEmissao,
      classificacaoEconomica: classificacao.trim(),
      fonteRecursoTipo: Number(apenasDigitos(fonte)),
      valor: moedaParaNumero(valor),
      historico: historico.trim() || null,
      cpfOrdenadorDespesa: apenasDigitos(cpf),
    };
    setSalvando(true);
    try {
      if (item) await empenhosApi.atualizar(prestacaoId, item.id, payload);
      else await empenhosApi.criar(prestacaoId, payload);
      onSuccess();
    } catch (e) {
      const cod = extrairCodigoErro(e);
      setErro(extrairMensagemErro(e, cod === 'EMPENHO_DUPLICADO' ? 'Já existe um empenho com este número e data.' : 'Não foi possível salvar.'));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={submeter} className="space-y-4">
      {erro && <AlertaErro msg={erro} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Número *" name="numero" value={numero} onChange={(e) => setNumero(e.target.value)} />
        <Input label="Data de Emissão *" name="dataEmissao" type="date" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} />
        <BuscaClassificacao name="classificacao" label="Classificação Econômica *" value={classificacao} onChange={setClassificacao} exercicio={exercicioEmpenho} hint={exercicioEmpenho ? `Códigos válidos para ${exercicioEmpenho}.` : undefined} />
        <SelectDominio label="Fonte de Recurso *" name="fonte" value={apenasDigitos(fonte)} onChange={setFonte} options={FONTE_RECURSO} />
        <Input label="Valor (R$) *" name="valor" value={valor} onChange={(e) => setValor(mascaraMoeda(e.target.value))} placeholder="0,00" inputMode="numeric" />
        <Input label="CPF do Ordenador *" name="cpf" value={mascaraCpfCnpj(cpf)} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" inputMode="numeric" />
        <div className="sm:col-span-2">
          <Input label="Histórico" name="historico" value={historico} onChange={(e) => setHistorico(e.target.value)} />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={salvando}>Cancelar</Button>
        <Button type="submit" disabled={salvando}>{salvando && <Loader2 className="h-4 w-4 animate-spin" />}{salvando ? 'Salvando...' : 'Salvar'}</Button>
      </div>
    </form>
  );
}
