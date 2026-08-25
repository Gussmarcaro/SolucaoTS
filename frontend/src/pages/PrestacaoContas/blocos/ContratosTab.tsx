import { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { MultiSelectDominio, SelectDominio } from '@/components/ui/SelectDominio';
import {
  CRITERIO_SELECAO,
  CRITERIO_SELECAO_OUTROS,
  NATUREZA_CONTRATACAO,
  NATUREZA_CONTRATACAO_OUTROS,
  VALOR_TIPO,
  CATEGORIA_DESPESA,
} from '@/lib/dominiosFaseV';
import { Combobox } from '@/components/ui/Combobox';
import { listarPlano } from '@/services/ajusteCsv.service';
import { Modal } from '@/components/ui/Modal';
import { GradeSimples } from '@/components/ui/GradeSimples';
import type { ColunaDef } from '@/hooks/useResizableColumns';
import { enterComoTab } from '@/lib/enterComoTab';
import { apenasDigitos, dataBr, formatarMoeda, mascaraCpfCnpj, mascaraMoeda, moedaParaNumero, numeroParaMascaraMoeda } from '@/lib/masks';
import { extrairMensagemErro } from '@/services/http';
import { contratosApi } from '@/services/contratosPrestacao.service';
import type { ContratoPayload, ContratoPrestacao, CredorTipoDoc, VigenciaTipo } from '@/types/prestacaoBlocos11';
import { ConfirmarExclusao } from '@/pages/Ajustes/tabs/TermosAditivosTab';
import { AlertaErro, IconBtn } from './_ui';

type ModalState = { tipo: 'fechado' } | { tipo: 'form'; item: ContratoPrestacao | null } | { tipo: 'excluir'; item: ContratoPrestacao };

/** Ações sempre primeiro, como nas grades dos cadastros. */
const COLUNAS: ColunaDef[] = [
  { key: 'acoes', label: 'Ações', width: 100, minWidth: 90, align: 'center', movivel: false },
  { key: 'numero', label: 'Número', width: 160, sortKey: 'numero' },
  { key: 'credor', label: 'Credor', width: 280, sortKey: 'credor' },
  { key: 'assinatura', label: 'Assinatura', width: 140, sortKey: 'dataAssinatura' },
  { key: 'valor', label: 'Valor', width: 170, align: 'right', sortKey: 'valorMontante' },
];

const TIPO_DOC = [
  { value: 'CPF', label: 'CPF' },
  { value: 'CNPJ', label: 'CNPJ' },
  { value: 'RNE', label: 'RNE (estrangeiro)' },
];
const TIPO_VIGENCIA = [
  { value: 'PRE_ESTABELECIDA', label: 'Pré-estabelecida' },
  { value: 'INDETERMINADA', label: 'Indeterminada' },
];

export function ContratosTab({
  prestacaoId,
  ajusteId,
}: {
  prestacaoId: string;
  ajusteId: string;
}) {
  const [lista, setLista] = useState<ContratoPrestacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ tipo: 'fechado' });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    contratosApi
      .listar(prestacaoId)
      .then((r) => vivo && setLista(r))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Falha ao carregar os contratos.')))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [prestacaoId, refreshKey]);

  const recarregar = () => {
    setModal({ tipo: 'fechado' });
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500 dark:text-ink-400">
          {lista.length > 0 ? `${lista.length} contrato(s)` : 'Contratos vigentes no período celebrados pela beneficiária.'}
        </p>
        <Button size="sm" onClick={() => setModal({ tipo: 'form', item: null })}><Plus className="h-4 w-4" />Adicionar</Button>
      </div>

      <GradeSimples
        storageKey="@SolucaoTS:grid:contratosPrestacao:v1"
        colunas={COLUNAS}
        dados={lista}
        chave={(i) => i.id}
        carregando={carregando}
        erro={erro}
        vazio="Nenhum contrato cadastrado."
        onDuploClique={(i) => setModal({ tipo: 'form', item: i })}
        valorOrdenacao={(campo, i) => {
          if (campo === 'numero') return i.numero;
          if (campo === 'credor') return i.credorNome || i.credorNumeroDoc;
          if (campo === 'dataAssinatura') return i.dataAssinatura;
          if (campo === 'valorMontante') return i.valorMontante;
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
            case 'numero':
              return <span className="block truncate text-ink-700 dark:text-ink-200">{i.numero}</span>;
            case 'credor':
              return <span className="block truncate text-ink-600 dark:text-ink-300" title={i.credorNome ?? ''}>{i.credorNome || mascaraCpfCnpj(i.credorNumeroDoc)}</span>;
            case 'assinatura':
              return <span className="block truncate text-ink-600 dark:text-ink-300">{dataBr(i.dataAssinatura)}</span>;
            case 'valor':
              return <span className="block truncate tabular-nums text-ink-700 dark:text-ink-200">{formatarMoeda(i.valorMontante)}</span>;
            default:
              return null;
          }
        }}
      />

      <Modal open={modal.tipo === 'form'} onClose={() => setModal({ tipo: 'fechado' })} title={modal.tipo === 'form' && modal.item ? 'Editar Contrato' : 'Novo Contrato'} size="2xl">
        {modal.tipo === 'form' && <ContratoForm prestacaoId={prestacaoId} ajusteId={ajusteId} item={modal.item} onSuccess={recarregar} onCancel={() => setModal({ tipo: 'fechado' })} />}
      </Modal>
      <ConfirmarExclusao
        aberto={modal.tipo === 'excluir'}
        rotulo="este contrato"
        onCancel={() => setModal({ tipo: 'fechado' })}
        onConfirm={async () => { if (modal.tipo !== 'excluir') return; await contratosApi.excluir(prestacaoId, modal.item.id); recarregar(); }}
      />
    </div>
  );
}

function ContratoForm({ prestacaoId, ajusteId, item, onSuccess, onCancel }: { prestacaoId: string; ajusteId: string; item: ContratoPrestacao | null; onSuccess: () => void; onCancel: () => void }) {
  /** Rubricas do Plano de Aplicação do ajuste — as mesmas do cadastro. */
  const [rubricas, setRubricas] = useState<{ categoria: string; subcategoria: string }[]>([]);

  useEffect(() => {
    if (!ajusteId) return;
    let vivo = true;
    listarPlano(ajusteId)
      .then((itens) => {
        if (!vivo) return;
        const vistas = new Map<string, { categoria: string; subcategoria: string }>();
        for (const i of itens)
          vistas.set(`${i.categoria}|${i.subcategoria}`, { categoria: i.categoria, subcategoria: i.subcategoria });
        setRubricas([...vistas.values()].sort((a, b) => `${a.categoria}${a.subcategoria}`.localeCompare(`${b.categoria}${b.subcategoria}`)));
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [ajusteId]);

  const [numero, setNumero] = useState(item?.numero ?? '');
  const [credorTipoDoc, setCredorTipoDoc] = useState<CredorTipoDoc>(item?.credorTipoDoc ?? 'CNPJ');
  const [credorNumeroDoc, setCredorNumeroDoc] = useState(item ? mascaraCpfCnpj(item.credorNumeroDoc) : '');
  const [credorNome, setCredorNome] = useState(item?.credorNome ?? '');
  const [dataAssinatura, setDataAssinatura] = useState(item?.dataAssinatura ?? '');
  const [vigenciaTipo, setVigenciaTipo] = useState<VigenciaTipo>(item?.vigenciaTipo ?? 'PRE_ESTABELECIDA');
  const [vigInicial, setVigInicial] = useState(item?.vigenciaDataInicial ?? '');
  const [vigFinal, setVigFinal] = useState(item?.vigenciaDataFinal ?? '');
  const [objeto, setObjeto] = useState(item?.objeto ?? '');
  const [natureza, setNatureza] = useState<number[]>(item?.naturezaContratacao ?? []);
  const [naturezaOutro, setNaturezaOutro] = useState(item?.naturezaOutro ?? '');
  const [criterio, setCriterio] = useState(item?.criterioSelecao != null ? String(item.criterioSelecao) : '');
  const [criterioOutro, setCriterioOutro] = useState(item?.criterioSelecaoOutro ?? '');
  const [artigo, setArtigo] = useState(item?.artigoRegulamentoCompras ?? '');
  const [valor, setValor] = useState(item ? numeroParaMascaraMoeda(item.valorMontante) : '');
  const [valorTipo, setValorTipo] = useState(item?.valorTipo != null ? String(item.valorTipo) : '');
  const [categoria, setCategoria] = useState(item?.categoriaDespesaTipo != null ? String(item.categoriaDespesaTipo) : '');
  const [proposta, setProposta] = useState(
    item?.propostaCategoria ? `${item.propostaCategoria}|${item.propostaSubcategoria ?? ''}` : '',
  );
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const ehRne = credorTipoDoc === 'RNE';

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!numero.trim()) return setErro('Informe o número do contrato.');
    if (!dataAssinatura) return setErro('Informe a data de assinatura.');
    if (!vigInicial) return setErro('Informe o início da vigência.');
    if (vigenciaTipo === 'PRE_ESTABELECIDA' && !vigFinal) return setErro('Informe o fim da vigência (pré-estabelecida).');
    if (!objeto.trim()) return setErro('Informe o objeto.');
    if (moedaParaNumero(valor) < 0) return setErro('Valor inválido.');

    const payload: ContratoPayload = {
      numero: numero.trim(),
      credorTipoDoc,
      credorNumeroDoc: ehRne ? credorNumeroDoc.trim() : apenasDigitos(credorNumeroDoc),
      credorNome: credorNome.trim() || null,
      dataAssinatura,
      vigenciaTipo,
      vigenciaDataInicial: vigInicial,
      vigenciaDataFinal: vigenciaTipo === 'PRE_ESTABELECIDA' ? vigFinal || null : null,
      objeto: objeto.trim(),
      naturezaContratacao: natureza,
      naturezaOutro: natureza.includes(23) ? naturezaOutro.trim() || null : null,
      criterioSelecao: criterio ? Number(criterio) : null,
      criterioSelecaoOutro: Number(criterio) === 4 ? criterioOutro.trim() || null : null,
      artigoRegulamentoCompras: artigo.trim() || null,
      valorMontante: moedaParaNumero(valor),
      categoriaDespesaTipo: categoria ? Number(apenasDigitos(categoria)) : null,
      propostaCategoria: proposta ? proposta.split('|')[0] : null,
      propostaSubcategoria: proposta ? proposta.split('|').slice(1).join('|') || null : null,
      valorTipo: valorTipo ? Number(valorTipo) : null,
    };
    setSalvando(true);
    try {
      if (item) await contratosApi.atualizar(prestacaoId, item.id, payload);
      else await contratosApi.criar(prestacaoId, payload);
      onSuccess();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível salvar o contrato.'));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={submeter} onKeyDown={enterComoTab} className="space-y-4">
      {erro && <AlertaErro msg={erro} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Número do contrato *" name="numero" value={numero} onChange={(e) => setNumero(e.target.value)} />
        <Input label="Data de assinatura *" name="assinatura" type="date" value={dataAssinatura} onChange={(e) => setDataAssinatura(e.target.value)} />

        <Select label="Tipo doc. do credor *" name="tipoDoc" value={credorTipoDoc} onChange={(e) => setCredorTipoDoc(e.target.value as CredorTipoDoc)} options={TIPO_DOC} />
        <Input label={ehRne ? 'Número do documento *' : `${credorTipoDoc} do credor *`} name="credorNum" value={ehRne ? credorNumeroDoc : mascaraCpfCnpj(credorNumeroDoc)} onChange={(e) => setCredorNumeroDoc(e.target.value)} inputMode={ehRne ? 'text' : 'numeric'} />
        <div className="sm:col-span-2">
          <Input label={`Nome/Razão social do credor${ehRne ? ' *' : ''}`} name="credorNome" value={credorNome} onChange={(e) => setCredorNome(e.target.value)} />
        </div>

        <Select label="Tipo de vigência *" name="vigTipo" value={vigenciaTipo} onChange={(e) => setVigenciaTipo(e.target.value as VigenciaTipo)} options={TIPO_VIGENCIA} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Vigência (início) *" name="vigIni" type="date" value={vigInicial} onChange={(e) => setVigInicial(e.target.value)} />
          <Input label="Vigência (fim)" name="vigFim" type="date" value={vigFinal} onChange={(e) => setVigFinal(e.target.value)} disabled={vigenciaTipo === 'INDETERMINADA'} />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-300">Objeto *</label>
          <textarea value={objeto} onChange={(e) => setObjeto(e.target.value)} rows={2} className="focus-ring w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100" />
        </div>

        <MultiSelectDominio label="Natureza da contratação" value={natureza} onChange={setNatureza} options={NATUREZA_CONTRATACAO} />
        {natureza.includes(NATUREZA_CONTRATACAO_OUTROS) && <Input label={`Descrição de outros serviços (natureza ${NATUREZA_CONTRATACAO_OUTROS}) *`} name="natOutro" value={naturezaOutro} onChange={(e) => setNaturezaOutro(e.target.value)} />}

        <SelectDominio label="Critério de seleção" name="criterio" value={apenasDigitos(criterio)} onChange={setCriterio} options={CRITERIO_SELECAO} />
        {Number(criterio) === CRITERIO_SELECAO_OUTROS && <Input label={`Descrição de outro critério (critério ${CRITERIO_SELECAO_OUTROS}) *`} name="critOutro" value={criterioOutro} onChange={(e) => setCriterioOutro(e.target.value)} />}

        <Input label="Artigo do regulamento de compras" name="artigo" value={artigo} onChange={(e) => setArtigo(e.target.value)} placeholder="Obrigatório p/ Contrato de Gestão e Termo de Parceria" />
        <Input label="Valor do contrato (R$) *" name="valor" value={valor} onChange={(e) => setValor(mascaraMoeda(e.target.value))} placeholder="0,00" inputMode="numeric" />
        <SelectDominio label="Tipo de valor" name="valorTipo" value={apenasDigitos(valorTipo)} onChange={setValorTipo} options={VALOR_TIPO} />
      </div>

      {/* Classificação da despesa contratada. Preenchida aqui uma vez, o
          documento fiscal a herda ao apontar para este contrato — em vez de
          reclassificar nota a nota, com o risco de duas divergirem. */}
      <fieldset className="rounded-xl border border-ink-200 px-3 pb-3 pt-1 dark:border-ink-700">
        <legend className="px-1 text-[13px] font-normal text-ink-600 dark:text-ink-300">
          Classificação da despesa{' '}
          <span className="text-ink-400">— herdada pelos documentos fiscais deste contrato</span>
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectDominio
            label="Categoria de Despesa AUDESP"
            name="categoria"
            value={apenasDigitos(categoria)}
            onChange={setCategoria}
            options={CATEGORIA_DESPESA}
          />
          <Combobox
            label="Categoria da Despesa PROPOSTA"
            name="proposta"
            value={proposta}
            onChange={setProposta}
            options={rubricas.map((r) => ({
              value: `${r.categoria}|${r.subcategoria}`,
              label: r.subcategoria,
              sub: r.categoria,
            }))}
            placeholder={rubricas.length ? 'Digite para localizar...' : 'Plano de Aplicação sem itens'}
            disabled={!rubricas.length && !proposta}
            hint="Rubricas do Plano de Aplicação deste ajuste."
          />
        </div>
      </fieldset>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={salvando}>Cancelar</Button>
        <Button type="submit" disabled={salvando}>{salvando && <Loader2 className="h-4 w-4 animate-spin" />}{salvando ? 'Salvando...' : 'Salvar'}</Button>
      </div>
    </form>
  );
}
