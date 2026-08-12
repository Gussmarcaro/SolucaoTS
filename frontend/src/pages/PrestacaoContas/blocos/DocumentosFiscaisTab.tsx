import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SelectDominio } from '@/components/ui/SelectDominio';
import { CATEGORIA_DESPESA, ESTADO_EMISSOR } from '@/lib/dominiosFaseV';
import { Modal } from '@/components/ui/Modal';
import { GradeSimples } from '@/components/ui/GradeSimples';
import type { ColunaDef } from '@/hooks/useResizableColumns';
import {
  apenasDigitos,
  dataBr,
  formatarMoeda,
  mascaraCpfCnpj,
  mascaraMoeda,
  moedaParaNumero,
  numeroParaMascaraMoeda,
} from '@/lib/masks';
import { capitalizarNome } from '@/lib/nomeProprio';
import { enterComoTab } from '@/lib/enterComoTab';
import { extrairCodigoErro, extrairMensagemErro } from '@/services/http';
import {
  atualizarDocumentoFiscal,
  criarDocumentoFiscal,
  excluirDocumentoFiscal,
  listarDocumentosFiscais,
} from '@/services/prestacaoBlocos.service';
import type { DocumentoFiscal, DocumentoFiscalPayload, TipoDocumento } from '@/types/prestacaoBlocos';
import { ConfirmarExclusao } from '@/pages/Ajustes/tabs/TermosAditivosTab';

type ModalState =
  | { tipo: 'fechado' }
  | { tipo: 'form'; doc: DocumentoFiscal | null }
  | { tipo: 'excluir'; doc: DocumentoFiscal };

/** Ações sempre primeiro, como nas grades dos cadastros. */
const COLUNAS: ColunaDef[] = [
  { key: 'acoes', label: 'Ações', width: 100, minWidth: 90, align: 'center', movivel: false },
  { key: 'numero', label: 'Número', width: 130, sortKey: 'numero' },
  { key: 'credor', label: 'Credor', width: 260, sortKey: 'credor' },
  { key: 'emissao', label: 'Emissão', width: 130, sortKey: 'dataEmissao' },
  { key: 'bruto', label: 'Bruto', width: 150, align: 'right', sortKey: 'valorBruto' },
  { key: 'encargos', label: 'Encargos', width: 150, align: 'right', sortKey: 'valorEncargos' },
];

export function DocumentosFiscaisTab({ prestacaoId }: { prestacaoId: string }) {
  const [lista, setLista] = useState<DocumentoFiscal[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ tipo: 'fechado' });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    listarDocumentosFiscais(prestacaoId)
      .then((r) => vivo && setLista(r))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Falha ao carregar os documentos.')))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [prestacaoId, refreshKey]);

  const recarregar = () => {
    setModal({ tipo: 'fechado' });
    setRefreshKey((k) => k + 1);
  };
  const total = lista.reduce((s, d) => s + d.valorBruto, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500 dark:text-ink-400">
          {lista.length > 0 ? `${lista.length} documento(s) · bruto ${formatarMoeda(total)}` : 'Notas, recibos e faturas do período.'}
        </p>
        <Button size="sm" onClick={() => setModal({ tipo: 'form', doc: null })}>
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </div>

      <GradeSimples
        storageKey="@SolucaoTS:grid:documentosFiscais:v1"
        colunas={COLUNAS}
        dados={lista}
        chave={(d) => d.id}
        carregando={carregando}
        erro={erro}
        vazio="Nenhum documento fiscal cadastrado."
        onDuploClique={(d) => setModal({ tipo: 'form', doc: d })}
        valorOrdenacao={(campo, d) => {
          if (campo === 'numero') return d.numero;
          if (campo === 'credor') return d.credorNome || d.credorNumeroDoc;
          if (campo === 'dataEmissao') return d.dataEmissao;
          if (campo === 'valorBruto') return d.valorBruto;
          if (campo === 'valorEncargos') return d.valorEncargos;
          return null;
        }}
        renderCell={(coluna, d) => {
          switch (coluna) {
            case 'acoes':
              return (
                <div className="flex items-center justify-center gap-1">
                  <IconBtn title="Editar" onClick={() => setModal({ tipo: 'form', doc: d })}><Pencil className="h-4 w-4" /></IconBtn>
                  <IconBtn title="Excluir" danger onClick={() => setModal({ tipo: 'excluir', doc: d })}><Trash2 className="h-4 w-4" /></IconBtn>
                </div>
              );
            case 'numero':
              return <span className="block truncate font-mono text-xs text-ink-800 dark:text-ink-100">{d.numero}</span>;
            case 'credor':
              return (
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-ink-700 dark:text-ink-200">
                    {d.credorTipoDoc === 'RNE' ? d.credorNumeroDoc : mascaraCpfCnpj(d.credorNumeroDoc)}
                  </p>
                  {d.credorNome && <p className="truncate text-xs text-ink-400" title={d.credorNome}>{d.credorNome}</p>}
                </div>
              );
            case 'emissao':
              return <span className="block truncate text-ink-600 dark:text-ink-300">{dataBr(d.dataEmissao)}</span>;
            case 'bruto':
              return <span className="block truncate tabular-nums text-ink-700 dark:text-ink-200">{formatarMoeda(d.valorBruto)}</span>;
            case 'encargos':
              return <span className="block truncate tabular-nums text-ink-500 dark:text-ink-400">{formatarMoeda(d.valorEncargos)}</span>;
            default:
              return null;
          }
        }}
      />

      <Modal
        open={modal.tipo === 'form'}
        onClose={() => setModal({ tipo: 'fechado' })}
        title={modal.tipo === 'form' && modal.doc ? 'Editar Documento Fiscal' : 'Novo Documento Fiscal'}
        size="2xl"
      >
        {modal.tipo === 'form' && (
          <DocForm prestacaoId={prestacaoId} doc={modal.doc} onSuccess={recarregar} onCancel={() => setModal({ tipo: 'fechado' })} />
        )}
      </Modal>

      <ConfirmarExclusao
        aberto={modal.tipo === 'excluir'}
        rotulo={modal.tipo === 'excluir' ? `o documento nº ${modal.doc.numero}` : ''}
        onCancel={() => setModal({ tipo: 'fechado' })}
        onConfirm={async () => {
          if (modal.tipo !== 'excluir') return;
          await excluirDocumentoFiscal(prestacaoId, modal.doc.id);
          recarregar();
        }}
      />
    </div>
  );
}

function DocForm({
  prestacaoId,
  doc,
  onSuccess,
  onCancel,
}: {
  prestacaoId: string;
  doc: DocumentoFiscal | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [numero, setNumero] = useState(doc?.numero ?? '');
  const [tipo, setTipo] = useState<TipoDocumento>(doc?.credorTipoDoc ?? 'CNPJ');
  const [credorDoc, setCredorDoc] = useState(doc?.credorNumeroDoc ?? '');
  const [credorNome, setCredorNome] = useState(doc?.credorNome ?? '');
  const [descricao, setDescricao] = useState(doc?.descricao ?? '');
  const [dataEmissao, setDataEmissao] = useState(doc?.dataEmissao ?? '');
  const [categoria, setCategoria] = useState(doc ? String(doc.categoriaDespesaTipo) : '');
  const [bruto, setBruto] = useState(doc ? numeroParaMascaraMoeda(doc.valorBruto) : '');
  const [encargos, setEncargos] = useState(doc ? numeroParaMascaraMoeda(doc.valorEncargos) : '');
  const [contratoNumero, setContratoNumero] = useState(doc?.contratoNumero ?? '');
  const [estadoEmissor, setEstadoEmissor] = useState(doc?.estadoEmissor != null ? String(doc.estadoEmissor) : '');
  const [rateio, setRateio] = useState(doc?.rateioProveniente ?? false);
  const [rateioPct, setRateioPct] = useState(doc?.rateioPercentual != null ? String(doc.rateioPercentual) : '');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!numero.trim()) return setErro('Informe o número do documento.');
    if (tipo === 'RNE' ? !credorDoc.trim() : apenasDigitos(credorDoc).length < 11) return setErro('Documento do credor inválido.');
    if (tipo === 'RNE' && !credorNome.trim()) return setErro('Para RNE, informe o nome do credor.');
    if (!descricao.trim()) return setErro('Informe a descrição.');
    if (!dataEmissao) return setErro('Informe a data de emissão.');
    const vBruto = moedaParaNumero(bruto);
    const vEnc = encargos ? moedaParaNumero(encargos) : 0;
    if (vBruto <= 0) return setErro('Valor bruto inválido.');
    if (vEnc >= vBruto) return setErro('Encargos devem ser menores que o valor bruto.');
    if (!categoria.trim()) return setErro('Informe a categoria de despesa.');

    const payload: DocumentoFiscalPayload = {
      numero: numero.trim(),
      credorTipoDoc: tipo,
      credorNumeroDoc: tipo === 'RNE' ? credorDoc.trim() : apenasDigitos(credorDoc),
      credorNome: credorNome.trim() || null,
      contratoNumero: contratoNumero.trim() || null,
      descricao: descricao.trim(),
      dataEmissao,
      estadoEmissor: estadoEmissor ? Number(apenasDigitos(estadoEmissor)) : null,
      valorBruto: vBruto,
      valorEncargos: vEnc,
      categoriaDespesaTipo: Number(apenasDigitos(categoria)),
      rateioProveniente: rateio,
      rateioPercentual: rateio && rateioPct ? Number(rateioPct.replace(',', '.')) : null,
    };

    setSalvando(true);
    try {
      if (doc) await atualizarDocumentoFiscal(prestacaoId, doc.id, payload);
      else await criarDocumentoFiscal(prestacaoId, payload);
      onSuccess();
    } catch (e) {
      const cod = extrairCodigoErro(e);
      setErro(extrairMensagemErro(e, cod === 'DOC_FISCAL_DUPLICADO' ? 'Já existe um documento com este número e credor.' : 'Não foi possível salvar.'));
    } finally {
      setSalvando(false);
    }
  }

  return (
    // `enterComoTab`: o Enter anda para o próximo campo em vez de salvar, como
    // nos cadastros.
    <form onSubmit={submeter} onKeyDown={enterComoTab} className="space-y-5">
      {erro && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{erro}</span>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Número *" name="numero" value={numero} onChange={(e) => setNumero(e.target.value)} />
        <Input label="Data de Emissão *" name="dataEmissao" type="date" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} />

        <Select label="Tipo do Credor *" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoDocumento)} options={[{ value: 'CNPJ', label: 'CNPJ' }, { value: 'CPF', label: 'CPF' }, { value: 'RNE', label: 'RNE (estrangeiro)' }]} />
        <Input
          label={tipo === 'RNE' ? 'RNE do Credor *' : `${tipo} do Credor *`}
          name="credorDoc"
          value={tipo === 'RNE' ? credorDoc : mascaraCpfCnpj(credorDoc)}
          onChange={(e) => setCredorDoc(e.target.value)}
          inputMode={tipo === 'RNE' ? 'text' : 'numeric'}
        />

        <div className="sm:col-span-2">
          <Input label={`Nome do Credor${tipo === 'RNE' ? ' *' : ''}`} name="credorNome" value={credorNome} onChange={(e) => setCredorNome(capitalizarNome(e.target.value))} />
        </div>
        <div className="sm:col-span-2">
          <Input label="Descrição *" name="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>

        <Input label="Valor Bruto (R$) *" name="bruto" value={bruto} onChange={(e) => setBruto(mascaraMoeda(e.target.value))} placeholder="0,00" inputMode="numeric" />
        <Input label="Encargos (R$)" name="encargos" value={encargos} onChange={(e) => setEncargos(mascaraMoeda(e.target.value))} placeholder="0,00" inputMode="numeric" hint="Deve ser menor que o bruto." />

        <SelectDominio label="Categoria de Despesa *" name="categoria" value={apenasDigitos(categoria)} onChange={setCategoria} options={CATEGORIA_DESPESA} />
        <Input label="Nº do Contrato (opcional)" name="contratoNumero" value={contratoNumero} onChange={(e) => setContratoNumero(e.target.value)} />

        <SelectDominio label="UF do Emissor (opcional)" name="estadoEmissor" value={apenasDigitos(estadoEmissor)} onChange={setEstadoEmissor} options={ESTADO_EMISSOR} />
        <div className="flex flex-col justify-end gap-2">
          <label className="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-200">
            <input type="checkbox" checked={rateio} onChange={(e) => setRateio(e.target.checked)} className="h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-400 dark:border-ink-600 dark:bg-ink-800" />
            Proveniente de rateio
          </label>
          {rateio && (
            <Input label="Percentual do rateio (%)" name="rateioPct" value={rateioPct} onChange={(e) => setRateioPct(e.target.value.replace(/[^\d,]/g, ''))} placeholder="ex.: 50" inputMode="numeric" />
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={salvando}>Cancelar</Button>
        <Button type="submit" disabled={salvando}>
          {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
          {salvando ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}

function IconBtn({ children, title, onClick, danger }: { children: React.ReactNode; title: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" title={title} onClick={onClick} className={`focus-ring rounded-lg p-1.5 transition-colors ${danger ? 'text-ink-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10' : 'text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-200'}`}>
      {children}
    </button>
  );
}
