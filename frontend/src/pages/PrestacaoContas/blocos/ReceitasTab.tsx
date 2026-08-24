import { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { GradeSimples } from '@/components/ui/GradeSimples';
import type { ColunaDef } from '@/hooks/useResizableColumns';
import { enterComoTab } from '@/lib/enterComoTab';
import { SelectDominio } from '@/components/ui/SelectDominio';
import { BANCO, FONTE_RECURSO } from '@/lib/dominiosFaseV';
import { apenasDigitos, dataBr, formatarMoeda, mascaraMoeda, moedaParaNumero, numeroParaMascaraMoeda } from '@/lib/masks';
import { extrairMensagemErro } from '@/services/http';
import { receitasApi } from '@/services/prestacaoBlocos2.service';
import { RECEITA_TIPO_LABEL, ehAplicacaoFinanceira, type Receita, type ReceitaPayload, type ReceitaTipo } from '@/types/prestacaoBlocos2';
import { ConfirmarExclusao } from '@/pages/Ajustes/tabs/TermosAditivosTab';
import { AlertaErro, IconBtn } from './_ui';

type ModalState = { tipo: 'fechado' } | { tipo: 'form'; item: Receita | null } | { tipo: 'excluir'; item: Receita };

/** Ações sempre primeiro, como nas grades dos cadastros. */
const COLUNAS: ColunaDef[] = [
  { key: 'acoes', label: 'Ações', width: 100, minWidth: 90, align: 'center', movivel: false },
  { key: 'tipo', label: 'Tipo', width: 240, sortKey: 'tipo' },
  { key: 'repasse', label: 'Repasse', width: 140, sortKey: 'dataRepasse' },
  { key: 'descricao', label: 'Descrição', width: 240, sortKey: 'descricao' },
  { key: 'valor', label: 'Valor', width: 170, align: 'right', sortKey: 'valor' },
];

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

      <GradeSimples
        storageKey="@SolucaoTS:grid:receitas:v1"
        colunas={COLUNAS}
        dados={lista}
        chave={(i) => i.id}
        carregando={carregando}
        erro={erro}
        vazio="Nenhuma receita cadastrada."
        onDuploClique={(i) => setModal({ tipo: 'form', item: i })}
        valorOrdenacao={(campo, i) => {
          if (campo === 'tipo') return RECEITA_TIPO_LABEL[i.tipo];
          if (campo === 'dataRepasse') return i.dataRepasse;
          if (campo === 'descricao') return i.descricao;
          if (campo === 'valor') return i.valor;
          return null;
        }}
        renderCell={(coluna, i) => {
          switch (coluna) {
            case 'acoes':
              return (
                <div className="flex items-center justify-center gap-1">
                  <IconBtn title="Editar" onClick={() => setModal({ tipo: 'form', item: i })}><Pencil className="h-4 w-4" /></IconBtn>
                  <IconBtn title="Excluir" danger onClick={() => setModal({ tipo: 'excluir', item: i })}><Trash2 className="h-4 w-4" /></IconBtn>
                </div>
              );
            case 'tipo':
              return <span className="block truncate text-ink-700 dark:text-ink-200" title={RECEITA_TIPO_LABEL[i.tipo]}>{RECEITA_TIPO_LABEL[i.tipo]}</span>;
            case 'repasse':
              return <span className="block truncate text-ink-600 dark:text-ink-300">{i.dataRepasse ? dataBr(i.dataRepasse) : '—'}</span>;
            case 'descricao':
              return <span className="block truncate text-ink-500 dark:text-ink-400" title={i.descricao ?? ''}>{i.descricao ?? '—'}</span>;
            case 'valor':
              return (
                <span className={`block truncate tabular-nums ${i.valor < 0 ? 'text-red-500' : 'text-ink-700 dark:text-ink-200'}`}>
                  {formatarMoeda(i.valor)}
                </span>
              );
            default:
              return null;
          }
        }}
      />

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
  const [banco, setBanco] = useState(item?.banco != null ? String(item.banco) : '');
  const [agencia, setAgencia] = useState(item?.agencia != null ? String(item.agencia) : '');
  const [conta, setConta] = useState(item?.contaCorrente ?? '');
  const [transacao, setTransacao] = useState(item?.numeroTransacao ?? '');
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
      banco: banco ? Number(apenasDigitos(banco)) : null,
      agencia: agencia ? Number(apenasDigitos(agencia)) : null,
      contaCorrente: conta.trim() || null,
      numeroTransacao: transacao.trim() || null,
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
    <form onSubmit={submeter} onKeyDown={enterComoTab} className="space-y-4">
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

      {/*
        Identificação bancária — controle do órgão, e **não** vai ao TCESP.

        Em Pagamentos esses campos são obrigatórios porque o schema oficial os
        exige; aqui o bloco `receitas` é um objeto de totais e não tem onde
        recebê-los. Por isso são todos opcionais, e o rótulo do grupo diz que
        não são transmitidos: um campo que parece obrigação do Tribunal e não é
        faz o usuário caçar dado que ninguém vai ler.
      */}
      <fieldset className="rounded-xl border border-ink-200 px-3 pb-3 pt-1 dark:border-ink-700">
        <legend className="px-1 text-[13px] font-normal text-ink-600 dark:text-ink-300">
          Identificação bancária{' '}
          <span className="text-ink-400">— controle interno, não enviada ao TCESP</span>
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SelectDominio label="Banco" name="banco" value={apenasDigitos(banco)} onChange={setBanco} options={BANCO} />
          <Input label="Agência" name="agencia" value={apenasDigitos(agencia)} onChange={(e) => setAgencia(e.target.value)} inputMode="numeric" />
          <Input label="Conta Corrente" name="conta" value={conta} onChange={(e) => setConta(e.target.value)} />
        </div>
        <div className="mt-4">
          <Input label="Nº da Transação (opcional)" name="transacao" value={transacao} onChange={(e) => setTransacao(e.target.value)} />
        </div>
      </fieldset>
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={salvando}>Cancelar</Button>
        <Button type="submit" disabled={salvando}>{salvando && <Loader2 className="h-4 w-4 animate-spin" />}{salvando ? 'Salvando...' : 'Salvar'}</Button>
      </div>
    </form>
  );
}
