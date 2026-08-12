import { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { GradeSimples } from '@/components/ui/GradeSimples';
import type { ColunaDef } from '@/hooks/useResizableColumns';
import { enterComoTab } from '@/lib/enterComoTab';
import { dataBr, formatarMoeda, mascaraMoeda, moedaParaNumero, numeroParaMascaraMoeda } from '@/lib/masks';
import { extrairMensagemErro } from '@/services/http';
import { bensApi } from '@/services/prestacaoBlocos2.service';
import { CATEGORIA_BEM_LABEL, type BemPrestacao, type BemPrestacaoPayload, type CategoriaBem } from '@/types/prestacaoBlocos5';
import { ConfirmarExclusao } from '@/pages/Ajustes/tabs/TermosAditivosTab';
import { AlertaErro, IconBtn } from './_ui';

type ModalState = { tipo: 'fechado' } | { tipo: 'form'; item: BemPrestacao | null } | { tipo: 'excluir'; item: BemPrestacao };

/** Ações sempre primeiro, como nas grades dos cadastros. */
const COLUNAS: ColunaDef[] = [
  { key: 'acoes', label: 'Ações', width: 100, minWidth: 90, align: 'center', movivel: false },
  { key: 'categoria', label: 'Categoria', width: 200, sortKey: 'categoria' },
  { key: 'patrimonio', label: 'Patrimônio', width: 140, sortKey: 'numeroPatrimonio' },
  { key: 'descricao', label: 'Descrição', width: 240, sortKey: 'descricao' },
  { key: 'data', label: 'Data', width: 130, sortKey: 'data' },
  { key: 'valor', label: 'Valor', width: 160, align: 'right', sortKey: 'valor' },
];

const ehMovel = (c: CategoriaBem) => c.startsWith('MOVEL');
const exigeValor = (c: CategoriaBem) => c === 'MOVEL_ADQUIRIDO' || c === 'MOVEL_CEDIDO';
const labelData = (c: CategoriaBem) =>
  c.endsWith('ADQUIRIDO') ? 'Data de aquisição' : c.endsWith('CEDIDO') ? 'Data de cessão' : 'Data de baixa/devolução';

export function BensTab({ prestacaoId }: { prestacaoId: string }) {
  const [lista, setLista] = useState<BemPrestacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ tipo: 'fechado' });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    bensApi
      .listar(prestacaoId)
      .then((r) => vivo && setLista(r))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Falha ao carregar os bens.')))
      .finally(() => vivo && setCarregando(false));
    return () => { vivo = false; };
  }, [prestacaoId, refreshKey]);

  const recarregar = () => { setModal({ tipo: 'fechado' }); setRefreshKey((k) => k + 1); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500 dark:text-ink-400">Bens móveis e imóveis adquiridos, cedidos ou baixados no período.</p>
        <Button size="sm" onClick={() => setModal({ tipo: 'form', item: null })}><Plus className="h-4 w-4" />Adicionar</Button>
      </div>

      <GradeSimples
        storageKey="@SolucaoTS:grid:bensPrestacao:v1"
        colunas={COLUNAS}
        dados={lista}
        chave={(b) => b.id}
        carregando={carregando}
        erro={erro}
        vazio="Nenhum bem cadastrado."
        onDuploClique={(b) => setModal({ tipo: 'form', item: b })}
        valorOrdenacao={(campo, b) => {
          if (campo === 'categoria') return CATEGORIA_BEM_LABEL[b.categoria];
          if (campo === 'numeroPatrimonio') return b.numeroPatrimonio;
          if (campo === 'descricao') return b.descricao;
          if (campo === 'data') return b.data;
          if (campo === 'valor') return b.valor;
          return null;
        }}
        renderCell={(coluna, b) => {
          switch (coluna) {
            case 'acoes':
              return (
                <div className="flex items-center justify-center gap-1">
                  <IconBtn title="Editar" onClick={() => setModal({ tipo: 'form', item: b })}><Pencil className="h-4 w-4" /></IconBtn>
                  <IconBtn title="Excluir" danger onClick={() => setModal({ tipo: 'excluir', item: b })}><Trash2 className="h-4 w-4" /></IconBtn>
                </div>
              );
            case 'categoria':
              return <span className="block truncate text-ink-700 dark:text-ink-200" title={CATEGORIA_BEM_LABEL[b.categoria]}>{CATEGORIA_BEM_LABEL[b.categoria]}</span>;
            case 'patrimonio':
              return <span className="block truncate font-mono text-xs text-ink-600 dark:text-ink-300">{b.numeroPatrimonio ?? '—'}</span>;
            case 'descricao':
              return <span className="block truncate text-ink-600 dark:text-ink-300" title={b.descricao}>{b.descricao}</span>;
            case 'data':
              return <span className="block truncate text-ink-600 dark:text-ink-300">{dataBr(b.data)}</span>;
            case 'valor':
              return <span className="block truncate tabular-nums text-ink-700 dark:text-ink-200">{b.valor != null ? formatarMoeda(b.valor) : '—'}</span>;
            default:
              return null;
          }
        }}
      />

      <Modal open={modal.tipo === 'form'} onClose={() => setModal({ tipo: 'fechado' })} title={modal.tipo === 'form' && modal.item ? 'Editar Bem' : 'Novo Bem'} size="lg">
        {modal.tipo === 'form' && <BemForm prestacaoId={prestacaoId} item={modal.item} onSuccess={recarregar} onCancel={() => setModal({ tipo: 'fechado' })} />}
      </Modal>
      <ConfirmarExclusao
        aberto={modal.tipo === 'excluir'}
        rotulo="este bem"
        onCancel={() => setModal({ tipo: 'fechado' })}
        onConfirm={async () => { if (modal.tipo !== 'excluir') return; await bensApi.excluir(prestacaoId, modal.item.id); recarregar(); }}
      />
    </div>
  );
}

function BemForm({ prestacaoId, item, onSuccess, onCancel }: { prestacaoId: string; item: BemPrestacao | null; onSuccess: () => void; onCancel: () => void }) {
  const [categoria, setCategoria] = useState<CategoriaBem>(item?.categoria ?? 'MOVEL_ADQUIRIDO');
  const [numeroPatrimonio, setNumeroPatrimonio] = useState(item?.numeroPatrimonio ?? '');
  const [descricao, setDescricao] = useState(item?.descricao ?? '');
  const [data, setData] = useState(item?.data ?? '');
  const [valor, setValor] = useState(item?.valor != null ? numeroParaMascaraMoeda(item.valor) : '');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const movel = ehMovel(categoria);
  const comValor = exigeValor(categoria);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!descricao.trim()) return setErro('Informe a descrição.');
    if (!data) return setErro('Informe a data.');
    if (movel && !numeroPatrimonio.trim()) return setErro('Informe o número de patrimônio.');
    if (comValor && moedaParaNumero(valor) <= 0) return setErro(categoria === 'MOVEL_CEDIDO' ? 'Valor da cessão é obrigatório.' : 'Informe o valor de aquisição.');

    const payload: BemPrestacaoPayload = {
      categoria,
      numeroPatrimonio: movel ? numeroPatrimonio.trim() : null,
      descricao: descricao.trim(),
      data,
      valor: comValor ? moedaParaNumero(valor) : null,
    };
    setSalvando(true);
    try {
      if (item) await bensApi.atualizar(prestacaoId, item.id, payload);
      else await bensApi.criar(prestacaoId, payload);
      onSuccess();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível salvar o bem.'));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={submeter} onKeyDown={enterComoTab} className="space-y-4">
      {erro && <AlertaErro msg={erro} />}
      <Select
        label="Categoria *"
        name="categoria"
        value={categoria}
        onChange={(e) => setCategoria(e.target.value as CategoriaBem)}
        options={(Object.keys(CATEGORIA_BEM_LABEL) as CategoriaBem[]).map((c) => ({ value: c, label: CATEGORIA_BEM_LABEL[c] }))}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {movel && <Input label="Nº de Patrimônio *" name="numeroPatrimonio" value={numeroPatrimonio} onChange={(e) => setNumeroPatrimonio(e.target.value)} />}
        <Input label={`${labelData(categoria)} *`} name="data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
        <div className="sm:col-span-2">
          <Input label="Descrição *" name="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>
        {comValor && (
          <Input label={`${categoria === 'MOVEL_CEDIDO' ? 'Valor da cessão' : 'Valor de aquisição'} (R$) *`} name="valor" value={valor} onChange={(e) => setValor(mascaraMoeda(e.target.value))} placeholder="0,00" inputMode="numeric" />
        )}
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={salvando}>Cancelar</Button>
        <Button type="submit" disabled={salvando}>{salvando && <Loader2 className="h-4 w-4 animate-spin" />}{salvando ? 'Salvando...' : 'Salvar'}</Button>
      </div>
    </form>
  );
}
