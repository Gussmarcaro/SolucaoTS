import { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { GradeSimples } from '@/components/ui/GradeSimples';
import type { ColunaDef } from '@/hooks/useResizableColumns';
import { enterComoTab } from '@/lib/enterComoTab';
import { SelectDominio } from '@/components/ui/SelectDominio';
import { BANCO, CONTA_TIPO, rotulo } from '@/lib/dominiosFaseV';
import { apenasDigitos, formatarMoeda, mascaraMoeda, moedaParaNumero, numeroParaMascaraMoeda } from '@/lib/masks';
import { extrairMensagemErro } from '@/services/http';
import { disponibilidadesApi, saldoFundoFixoApi } from '@/services/prestacaoBlocos2.service';
import type { Disponibilidade, DisponibilidadePayload } from '@/types/prestacaoBlocos2';
import { ConfirmarExclusao } from '@/pages/Ajustes/tabs/TermosAditivosTab';
import { AlertaErro, IconBtn } from './_ui';

type ModalState = { tipo: 'fechado' } | { tipo: 'form'; item: Disponibilidade | null } | { tipo: 'excluir'; item: Disponibilidade };

/** Ações sempre primeiro, como nas grades dos cadastros. */
const COLUNAS: ColunaDef[] = [
  { key: 'acoes', label: 'Ações', width: 100, minWidth: 90, align: 'center', movivel: false },
  { key: 'banco', label: 'Banco / Agência', width: 180, sortKey: 'banco' },
  { key: 'conta', label: 'Conta', width: 200, sortKey: 'conta' },
  { key: 'saldoBancario', label: 'Saldo bancário', width: 170, align: 'right', sortKey: 'saldoBancario' },
  { key: 'saldoContabil', label: 'Saldo contábil', width: 170, align: 'right', sortKey: 'saldoContabil' },
];

export function DisponibilidadesTab({ prestacaoId }: { prestacaoId: string }) {
  const [lista, setLista] = useState<Disponibilidade[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ tipo: 'fechado' });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    disponibilidadesApi
      .listar(prestacaoId)
      .then((r) => vivo && setLista(r))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Falha ao carregar as disponibilidades.')))
      .finally(() => vivo && setCarregando(false));
    return () => { vivo = false; };
  }, [prestacaoId, refreshKey]);

  const recarregar = () => { setModal({ tipo: 'fechado' }); setRefreshKey((k) => k + 1); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500 dark:text-ink-400">Saldos bancário e contábil na data final do período.</p>
        <Button size="sm" onClick={() => setModal({ tipo: 'form', item: null })}><Plus className="h-4 w-4" />Adicionar</Button>
      </div>

      <FundoFixo prestacaoId={prestacaoId} />

      <GradeSimples
        storageKey="@SolucaoTS:grid:disponibilidades:v1"
        colunas={COLUNAS}
        dados={lista}
        chave={(i) => i.id}
        carregando={carregando}
        erro={erro}
        vazio="Nenhuma disponibilidade cadastrada."
        onDuploClique={(i) => setModal({ tipo: 'form', item: i })}
        valorOrdenacao={(campo, i) => {
          if (campo === 'banco') return i.banco;
          if (campo === 'conta') return i.conta;
          if (campo === 'saldoBancario') return i.saldoBancario;
          if (campo === 'saldoContabil') return i.saldoContabil;
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
            case 'banco':
              return <span className="block truncate text-ink-700 dark:text-ink-200">{i.banco} / {i.agencia}</span>;
            case 'conta':
              return (
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-ink-600 dark:text-ink-300">{i.conta}</p>
                  <p className="truncate text-xs text-ink-400">{rotulo(CONTA_TIPO, i.contaTipo)}</p>
                </div>
              );
            case 'saldoBancario':
              return <span className="block truncate tabular-nums text-ink-700 dark:text-ink-200">{formatarMoeda(i.saldoBancario)}</span>;
            case 'saldoContabil':
              return <span className="block truncate tabular-nums text-ink-500 dark:text-ink-400">{formatarMoeda(i.saldoContabil)}</span>;
            default:
              return null;
          }
        }}
      />

      <Modal open={modal.tipo === 'form'} onClose={() => setModal({ tipo: 'fechado' })} title={modal.tipo === 'form' && modal.item ? 'Editar Disponibilidade' : 'Nova Disponibilidade'} size="lg">
        {modal.tipo === 'form' && <DispForm prestacaoId={prestacaoId} item={modal.item} onSuccess={recarregar} onCancel={() => setModal({ tipo: 'fechado' })} />}
      </Modal>
      <ConfirmarExclusao
        aberto={modal.tipo === 'excluir'}
        rotulo="esta disponibilidade"
        onCancel={() => setModal({ tipo: 'fechado' })}
        onConfirm={async () => { if (modal.tipo !== 'excluir') return; await disponibilidadesApi.excluir(prestacaoId, modal.item.id); recarregar(); }}
      />
    </div>
  );
}

/**
 * Saldo do fundo fixo: valor único do bloco, não um item da lista de saldos.
 * É obrigatório no schema do TCESP — sem ele o envio é rejeitado, por isso
 * aparece sempre, mesmo quando zero.
 */
function FundoFixo({ prestacaoId }: { prestacaoId: string }) {
  const [valor, setValor] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    let vivo = true;
    saldoFundoFixoApi
      .obter(prestacaoId)
      .then((v) => vivo && setValor(numeroParaMascaraMoeda(v)))
      .catch(() => vivo && setErro('Falha ao carregar o saldo do fundo fixo.'))
      .finally(() => vivo && setCarregando(false));
    return () => { vivo = false; };
  }, [prestacaoId]);

  async function salvar() {
    setErro(null);
    setSalvando(true);
    try {
      await saldoFundoFixoApi.salvar(prestacaoId, moedaParaNumero(valor));
      setSalvo(true);
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível salvar o saldo do fundo fixo.'));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="rounded-xl border border-ink-200/70 p-3 dark:border-ink-800/70">
      {erro && <AlertaErro msg={erro} />}
      <div className="flex items-end gap-3">
        <div className="w-56">
          <Input
            label="Saldo do Fundo Fixo (R$) *"
            name="saldoFundoFixo"
            value={valor}
            onChange={(e) => { setValor(mascaraMoeda(e.target.value)); setSalvo(false); }}
            placeholder="0,00"
            inputMode="numeric"
            disabled={carregando}
            hint="Obrigatório no envio; informe 0,00 se não houver."
          />
        </div>
        <Button size="sm" variant="secondary" onClick={salvar} disabled={carregando || salvando}>
          {salvando ? 'Salvando...' : salvo ? 'Salvo' : 'Salvar'}
        </Button>
      </div>
    </div>
  );
}

function DispForm({ prestacaoId, item, onSuccess, onCancel }: { prestacaoId: string; item: Disponibilidade | null; onSuccess: () => void; onCancel: () => void }) {
  const [banco, setBanco] = useState(item ? String(item.banco) : '');
  const [agencia, setAgencia] = useState(item ? String(item.agencia) : '');
  const [conta, setConta] = useState(item?.conta ?? '');
  const [contaTipo, setContaTipo] = useState(item ? String(item.contaTipo) : '');
  const [saldoBanc, setSaldoBanc] = useState(item ? numeroParaMascaraMoeda(item.saldoBancario) : '');
  const [saldoCont, setSaldoCont] = useState(item ? numeroParaMascaraMoeda(item.saldoContabil) : '');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!banco.trim() || !agencia.trim() || !conta.trim() || !contaTipo.trim()) return setErro('Preencha banco, agência, conta e tipo.');
    const payload: DisponibilidadePayload = {
      banco: Number(apenasDigitos(banco)),
      agencia: Number(apenasDigitos(agencia)),
      conta: conta.trim(),
      contaTipo: Number(apenasDigitos(contaTipo)),
      saldoBancario: moedaParaNumero(saldoBanc),
      saldoContabil: moedaParaNumero(saldoCont),
    };
    setSalvando(true);
    try {
      if (item) await disponibilidadesApi.atualizar(prestacaoId, item.id, payload);
      else await disponibilidadesApi.criar(prestacaoId, payload);
      onSuccess();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível salvar.'));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={submeter} onKeyDown={enterComoTab} className="space-y-4">
      {erro && <AlertaErro msg={erro} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectDominio label="Banco *" name="banco" value={apenasDigitos(banco)} onChange={setBanco} options={BANCO} />
        <Input label="Agência *" name="agencia" value={apenasDigitos(agencia)} onChange={(e) => setAgencia(e.target.value)} inputMode="numeric" />
        <Input label="Conta *" name="conta" value={conta} onChange={(e) => setConta(e.target.value)} />
        <SelectDominio label="Tipo de Conta *" name="contaTipo" value={apenasDigitos(contaTipo)} onChange={setContaTipo} options={CONTA_TIPO} />
        <Input label="Saldo Bancário (R$) *" name="saldoBanc" value={saldoBanc} onChange={(e) => setSaldoBanc(mascaraMoeda(e.target.value))} placeholder="0,00" inputMode="numeric" />
        <Input label="Saldo Contábil (R$) *" name="saldoCont" value={saldoCont} onChange={(e) => setSaldoCont(mascaraMoeda(e.target.value))} placeholder="0,00" inputMode="numeric" />
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={salvando}>Cancelar</Button>
        <Button type="submit" disabled={salvando}>{salvando && <Loader2 className="h-4 w-4 animate-spin" />}{salvando ? 'Salvando...' : 'Salvar'}</Button>
      </div>
    </form>
  );
}
