import { useEffect, useState } from 'react';
import { AlertCircle, Download, FileUp, Loader2, Paperclip, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Combobox, type OpcaoCombo } from '@/components/ui/Combobox';
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
import { enterComoTab } from '@/lib/enterComoTab';
import { extrairCodigoErro, extrairMensagemErro } from '@/services/http';
import {
  atualizarDocumentoFiscal,
  baixarArquivoDocumentoFiscal,
  criarDocumentoFiscal,
  enviarArquivoDocumentoFiscal,
  excluirDocumentoFiscal,
  listarDocumentosFiscais,
  removerArquivoDocumentoFiscal,
} from '@/services/prestacaoBlocos.service';
import type { DocumentoFiscal, DocumentoFiscalPayload } from '@/types/prestacaoBlocos';
import {
  TIPO_DOCUMENTO_FISCAL_LABEL,
  TIPO_RETENCAO_LABEL,
  type TipoDocumentoFiscal,
  type TipoRetencao,
} from '@/types/prestacaoBlocos';
import { listarFornecedores } from '@/services/fornecedores.service';
import { listarPlano } from '@/services/ajusteCsv.service';
import type { Fornecedor } from '@/types/fornecedor';
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
  { key: 'nota', label: 'Nota', width: 90, align: 'center' },
];

export function DocumentosFiscaisTab({ prestacaoId, ajusteId }: { prestacaoId: string; ajusteId: string }) {
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
            case 'nota':
              // Sem anexo, um traço: ícone apagado convidaria ao clique que não
              // faz nada. Com anexo, abre a digitalização numa aba.
              return d.arquivoNome ? (
                <div className="flex items-center justify-center">
                  <IconBtn
                    title={`Abrir ${d.arquivoNome}`}
                    onClick={() =>
                      baixarArquivoDocumentoFiscal(prestacaoId, d.id).catch((e) =>
                        setErro(extrairMensagemErro(e, 'Não foi possível abrir o arquivo.')),
                      )
                    }
                  >
                    <Download className="h-4 w-4" />
                  </IconBtn>
                </div>
              ) : (
                <span className="text-ink-300 dark:text-ink-600">—</span>
              );
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
          <DocForm prestacaoId={prestacaoId} ajusteId={ajusteId} doc={modal.doc} onSuccess={recarregar} onCancel={() => setModal({ tipo: 'fechado' })} />
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
  ajusteId,
  doc,
  onSuccess,
  onCancel,
}: {
  prestacaoId: string;
  ajusteId: string;
  doc: DocumentoFiscal | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [numero, setNumero] = useState(doc?.numero ?? '');
  /**
   * Credor escolhido no cadastro de Fornecedores / Prestadores.
   *
   * O documento continua **gravando** tipo, número e nome do credor: é isso que
   * o TCESP recebe, e precisa ser a fotografia do credor na data da nota. Ligar
   * por chave estrangeira e derivar na montagem reescreveria o histórico se o
   * fornecedor mudasse de razão social depois de a prestação ser enviada.
   */
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [credorId, setCredorId] = useState('');
  /**
   * Rubricas do Plano de Aplicação do ajuste — as mesmas lançadas na aba
   * PLANO DE APLICAÇÃO do cadastro do Ajuste.
   *
   * O plano é mensal: a mesma rubrica aparece uma vez por mês. Aqui interessa a
   * rubrica, não o mês, então as repetições são reduzidas a pares distintos.
   */
  const [rubricas, setRubricas] = useState<{ categoria: string; subcategoria: string }[]>([]);
  const [proposta, setProposta] = useState('');
  const [descricao, setDescricao] = useState(doc?.descricao ?? '');
  const [dataEmissao, setDataEmissao] = useState(doc?.dataEmissao ?? '');
  const [tipoDoc, setTipoDoc] = useState<TipoDocumentoFiscal | ''>(doc?.tipoDocumento ?? '');
  const [categoria, setCategoria] = useState(doc ? String(doc.categoriaDespesaTipo) : '');
  const [bruto, setBruto] = useState(doc ? numeroParaMascaraMoeda(doc.valorBruto) : '');
  const [encargos, setEncargos] = useState(doc ? numeroParaMascaraMoeda(doc.valorEncargos) : '');
  const [retencao, setRetencao] = useState<TipoRetencao | ''>(doc?.retencaoTipo ?? '');
  const [contratoNumero, setContratoNumero] = useState(doc?.contratoNumero ?? '');
  const [estadoEmissor, setEstadoEmissor] = useState(doc?.estadoEmissor != null ? String(doc.estadoEmissor) : '');
  const [rateio, setRateio] = useState(doc?.rateioProveniente ?? false);
  const [rateioPct, setRateioPct] = useState(doc?.rateioPercentual != null ? String(doc.rateioPercentual) : '');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Só os ativos entram na lista de escolha. Um credor já gravado que não esteja
  // entre eles não some: vira a opção PRESERVADO, logo abaixo.
  useEffect(() => {
    let vivo = true;
    listarFornecedores({ filtros: { ativo: true }, page: 1, pageSize: 500, orderBy: 'nome', orderDir: 'asc' })
      .then((r) => vivo && setFornecedores(r.data))
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    if (!ajusteId) return;
    let vivo = true;
    listarPlano(ajusteId)
      .then((itens) => {
        if (!vivo) return;
        const vistas = new Map<string, { categoria: string; subcategoria: string }>();
        for (const i of itens) vistas.set(`${i.categoria}|${i.subcategoria}`, { categoria: i.categoria, subcategoria: i.subcategoria });
        setRubricas([...vistas.values()].sort((a, b) => `${a.categoria}${a.subcategoria}`.localeCompare(`${b.categoria}${b.subcategoria}`)));
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [ajusteId]);

  /** Chave da rubrica no combo — o par é o que a identifica. */
  const chaveRubrica = (categoria: string, subcategoria: string) => `${categoria}|${subcategoria}`;

  useEffect(() => {
    if (!doc?.propostaCategoria) return;
    setProposta(chaveRubrica(doc.propostaCategoria, doc.propostaSubcategoria ?? ''));
  }, [doc]);

  // Rubrica gravada que não está mais no plano (reimportado, ou alterado depois
  // do lançamento) continua selecionável — senão salvar outra alteração a perderia.
  const opcoesProposta: OpcaoCombo[] = (() => {
    const daLista = rubricas.map((r) => ({
      value: chaveRubrica(r.categoria, r.subcategoria),
      label: r.subcategoria,
      sub: r.categoria,
    }));
    const gravada = doc?.propostaCategoria
      ? chaveRubrica(doc.propostaCategoria, doc.propostaSubcategoria ?? '')
      : '';
    if (gravada && !daLista.some((o) => o.value === gravada))
      return [
        { value: gravada, label: doc!.propostaSubcategoria ?? '(sem subcategoria)', sub: `${doc!.propostaCategoria} · gravada neste documento, fora do plano atual` },
        ...daLista,
      ];
    return daLista;
  })();

  /**
   * O credor já gravado neste documento, quando não está entre os ativos.
   *
   * Sem isto, editar um documento antigo — ou de um fornecedor inativado depois —
   * abriria com o campo vazio, e salvar apagaria o credor. Vale também para o
   * credor cadastrado antes de existir esta tela.
   */
  const PRESERVADO = '__gravado__';
  const credorGravadoForaDaLista =
    !!doc && !fornecedores.some((f) => f.documento === doc.credorNumeroDoc);

  // Assim que a lista chega, pré-seleciona o credor do documento em edição.
  useEffect(() => {
    if (!doc) return;
    const achado = fornecedores.find((f) => f.documento === doc.credorNumeroDoc);
    setCredorId(achado ? achado.id : PRESERVADO);
  }, [doc, fornecedores]);

  const opcoesCredor: OpcaoCombo[] = [
    ...(credorGravadoForaDaLista && doc
      ? [{
          value: PRESERVADO,
          label: doc.credorNome || doc.credorNumeroDoc,
          sub: `${doc.credorTipoDoc} ${doc.credorTipoDoc === 'RNE' ? doc.credorNumeroDoc : mascaraCpfCnpj(doc.credorNumeroDoc)} · gravado neste documento, fora da lista de ativos`,
        }]
      : []),
    ...fornecedores.map((f) => ({
      value: f.id,
      label: f.nome,
      sub: `${f.documentoTipo} ${mascaraCpfCnpj(f.documento)}`,
    })),
  ];

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!numero.trim()) return setErro('Informe o número do documento.');
    if (!credorId) return setErro('Selecione o credor (Fornecedor / Prestador).');
    if (!descricao.trim()) return setErro('Informe a descrição.');
    if (!dataEmissao) return setErro('Informe a data de emissão.');
    const vBruto = moedaParaNumero(bruto);
    const vEnc = encargos ? moedaParaNumero(encargos) : 0;
    if (vBruto <= 0) return setErro('Valor bruto inválido.');
    if (vEnc >= vBruto) return setErro('Encargos devem ser menores que o valor bruto.');
    if (!categoria.trim()) return setErro('Informe a categoria de despesa.');
    // O servidor já recusa percentual fora de 0–100, mas avisar aqui poupa a
    // ida e volta — e o campo só existe quando a caixa está marcada.
    const pct = rateio ? Number(rateioPct.replace(',', '.')) : null;
    if (rateio && (pct === null || !Number.isFinite(pct) || pct <= 0 || pct > 100))
      return setErro('Informe o percentual do rateio (de 0 a 100).');

    // O credor é copiado do cadastro para o documento — fotografia, não vínculo.
    // Quando é o credor já gravado (fora da lista de ativos), reenvia-se o que
    // estava lá: editar outro campo não pode alterar o credor da nota.
    const escolhido = fornecedores.find((f) => f.id === credorId);
    if (!escolhido && credorId !== PRESERVADO)
      return setErro('Selecione o credor (Fornecedor / Prestador).');

    const payload: DocumentoFiscalPayload = {
      numero: numero.trim(),
      credorTipoDoc: escolhido ? escolhido.documentoTipo : doc!.credorTipoDoc,
      credorNumeroDoc: escolhido ? escolhido.documento : doc!.credorNumeroDoc,
      credorNome: escolhido ? escolhido.nome : doc!.credorNome,
      contratoNumero: contratoNumero.trim() || null,
      descricao: descricao.trim(),
      dataEmissao,
      estadoEmissor: estadoEmissor ? Number(apenasDigitos(estadoEmissor)) : null,
      valorBruto: vBruto,
      valorEncargos: vEnc,
      retencaoTipo: retencao || null,
      tipoDocumento: tipoDoc || null,
      categoriaDespesaTipo: Number(apenasDigitos(categoria)),
      propostaCategoria: proposta ? proposta.split('|')[0] : null,
      propostaSubcategoria: proposta ? proposta.split('|').slice(1).join('|') || null : null,
      rateioProveniente: rateio,
      rateioPercentual: pct,
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

        {/* Um campo no lugar de três: tipo, número e nome vêm do cadastro.
            Redigitar o credor a cada nota fazia o mesmo CNPJ aparecer com o nome
            escrito de formas diferentes ao longo do exercício. */}
        <div className="sm:col-span-2">
          <Combobox
            label="Credor (Fornecedor / Prestador) *"
            name="credorId"
            value={credorId}
            onChange={setCredorId}
            options={opcoesCredor}
            placeholder="Digite para localizar por nome ou documento..."
            hint="Vem de Cadastro → Fornecedores / Prestadores (CPF e CNPJ)."
          />
        </div>
        {/* O nº do contrato identifica o credor, não a despesa: fica junto do
            bloco do credor, e não lá embaixo entre categoria e UF. */}
        <Input label="Nº do Contrato (opcional)" name="contratoNumero" value={contratoNumero} onChange={(e) => setContratoNumero(e.target.value)} />
        <div className="sm:col-span-2">
          <Input label="Descrição *" name="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>

        {/*
          O valor continua, e é obrigatório: `valor_encargos` é campo exigido pelo
          schema do TCESP, numérico. O combo diz apenas QUAL retenção ele
          representa — isso o Tribunal não recebe, é conferência do órgão.
        */}
        <div className="sm:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
            <div className="sm:col-span-4">
              <Input label="Valor Bruto (R$) *" name="bruto" value={bruto} onChange={(e) => setBruto(mascaraMoeda(e.target.value))} placeholder="0,00" inputMode="numeric" />
            </div>
            <div className="sm:col-span-4">
              <Select
                label="Retenções"
                name="retencaoTipo"
                value={retencao}
                onChange={(e) => setRetencao(e.target.value as TipoRetencao | '')}
                placeholder="Selecione..."
                options={(Object.keys(TIPO_RETENCAO_LABEL) as TipoRetencao[]).map((t) => ({
                  value: t,
                  label: TIPO_RETENCAO_LABEL[t],
                }))}
              />
            </div>
            <div className="sm:col-span-4">
              <Input label="Retenções (R$)" name="encargos" value={encargos} onChange={(e) => setEncargos(mascaraMoeda(e.target.value))} placeholder="0,00" inputMode="numeric" hint="Deve ser menor que o bruto." />
            </div>
          </div>
        </div>

        {/*
          As três classificações numa linha só, e é útil que fiquem juntas: são
          três respostas para "que despesa é esta", em três vocabulários.

          - Tipo do Documento Fiscal: espécie do papel. Lista nossa.
          - Categoria AUDESP: os 88 códigos oficiais. É o que o TCESP recebe.
          - Categoria PROPOSTA: a rubrica do Plano de Aplicação do ajuste.

          A AUDESP fica com a maior fatia porque os rótulos dela são frases
          inteiras ("GASTOS ADMINISTRATIVOS - MATERIAL DE EXPEDIENTE/…").
        */}
        <div className="sm:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
            <div className="sm:col-span-3">
              <Select
                label="Tipo do Documento Fiscal"
                name="tipoDocumento"
                value={tipoDoc}
                onChange={(e) => setTipoDoc(e.target.value as TipoDocumentoFiscal | '')}
                placeholder="Selecione..."
                options={(Object.keys(TIPO_DOCUMENTO_FISCAL_LABEL) as TipoDocumentoFiscal[]).map((t) => ({
                  value: t,
                  label: TIPO_DOCUMENTO_FISCAL_LABEL[t],
                }))}
              />
            </div>
            <div className="sm:col-span-5">
              <SelectDominio label="Categoria de Despesa AUDESP *" name="categoria" value={apenasDigitos(categoria)} onChange={setCategoria} options={CATEGORIA_DESPESA} />
            </div>
            <div className="sm:col-span-4">
              <Combobox
                label="Categoria da Despesa PROPOSTA"
                name="proposta"
                value={proposta}
                onChange={setProposta}
                options={opcoesProposta}
                placeholder={rubricas.length ? 'Digite para localizar...' : 'Plano de Aplicação sem itens'}
                disabled={!rubricas.length && !proposta}
                hint="Rubricas do Plano de Aplicação deste ajuste."
              />
            </div>
          </div>
        </div>
        {/*
          Última linha, numa faixa só em vez de duas colunas.

          A UF é uma sigla: ocupar metade do formulário fazia um campo de duas
          letras parecer tão importante quanto a descrição. E o rateio crescia em
          altura ao ser marcado, desalinhando a linha inteira — agora o percentual
          entra **ao lado**, e a linha só fica mais larga.

          `items-end` encosta tudo na mesma base; a caixa de seleção ganha `h-10`
          para nascer na altura de um campo, e não colada no rodapé da linha.
        */}
        <div className="sm:col-span-2">
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <div className="w-full sm:w-56">
              <SelectDominio label="UF do Emissor (opcional)" name="estadoEmissor" value={apenasDigitos(estadoEmissor)} onChange={setEstadoEmissor} options={ESTADO_EMISSOR} />
            </div>

            <label className="flex h-10 shrink-0 cursor-pointer items-center gap-2 text-sm text-ink-700 dark:text-ink-200">
              <input
                type="checkbox"
                checked={rateio}
                onChange={(e) => setRateio(e.target.checked)}
                className="h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-400 dark:border-ink-600 dark:bg-ink-800"
              />
              Proveniente de rateio
            </label>

            {rateio && (
              <div className="w-32">
                <Input label="Percentual (%)" name="rateioPct" value={rateioPct} onChange={(e) => setRateioPct(e.target.value.replace(/[^\d,]/g, ''))} placeholder="ex.: 50" inputMode="numeric" />
              </div>
            )}
          </div>
        </div>
      </div>

      <AnexoDocumento prestacaoId={prestacaoId} doc={doc} />

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

/**
 * Digitalização da nota — é por aqui que a Comissão de Fiscalização chega ao
 * documento em si, e não só aos números dele.
 *
 * Só permite anexar na edição: o arquivo é guardado no registro, então ele
 * precisa existir antes. Num documento novo a mensagem diz isso, em vez de
 * oferecer um campo que falharia ao ser usado.
 */
function AnexoDocumento({ prestacaoId, doc }: { prestacaoId: string; doc: DocumentoFiscal | null }) {
  const [atual, setAtual] = useState(doc);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!doc || !atual) {
    return (
      <fieldset className="rounded-xl border border-dashed border-ink-200 px-3 pb-3 pt-1 dark:border-ink-700">
        <legend className="px-1 text-[13px] font-normal text-ink-600 dark:text-ink-300">
          Documento digitalizado
        </legend>
        <p className="text-xs text-ink-400">
          Cadastre o documento fiscal primeiro; o arquivo pode ser anexado ao editá-lo.
        </p>
      </fieldset>
    );
  }

  const alvo = atual;

  async function executar(acao: () => Promise<DocumentoFiscal>, msg: string) {
    setOcupado(true);
    setErro(null);
    try {
      setAtual(await acao());
    } catch (e) {
      setErro(extrairMensagemErro(e, msg));
    } finally {
      setOcupado(false);
    }
  }

  const tamanhoBr = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${Math.max(1, Math.round(bytes / 1024))} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  return (
    <fieldset className="rounded-xl border border-ink-200 px-3 pb-3 pt-1 dark:border-ink-700">
      <legend className="px-1 text-[13px] font-normal text-ink-600 dark:text-ink-300">
        Documento digitalizado{' '}
        <span className="text-ink-400">— disponível para a Comissão de Fiscalização</span>
      </legend>

      {alvo.arquivoNome ? (
        <div className="flex flex-wrap items-center gap-3">
          <Paperclip className="h-4 w-4 shrink-0 text-ink-400" />
          <span
            className="min-w-0 flex-1 truncate text-sm text-ink-700 dark:text-ink-200"
            title={alvo.arquivoNome}
          >
            {alvo.arquivoNome}
            {alvo.arquivoTamanho ? (
              <span className="ml-2 text-xs text-ink-400">{tamanhoBr(alvo.arquivoTamanho)}</span>
            ) : null}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={ocupado}
            onClick={() =>
              baixarArquivoDocumentoFiscal(prestacaoId, alvo.id).catch((e) =>
                setErro(extrairMensagemErro(e, 'Não foi possível abrir o arquivo.')),
              )
            }
          >
            <Download className="h-4 w-4" />
            Abrir
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={ocupado}
            onClick={() =>
              executar(
                () => removerArquivoDocumentoFiscal(prestacaoId, alvo.id),
                'Não foi possível remover o arquivo.',
              )
            }
          >
            <Trash2 className="h-4 w-4" />
            Remover
          </Button>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-wrap items-center gap-3">
          <span className="focus-ring inline-flex h-9 items-center gap-2 rounded-xl border border-ink-200 px-3 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-100 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-800">
            {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
            Anexar PDF
          </span>
          <span className="text-xs text-ink-400">Somente PDF, até 5 MB.</span>
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            disabled={ocupado}
            onChange={(e) => {
              const file = e.target.files?.[0];
              // Limpa o campo para que escolher o MESMO arquivo de novo, depois
              // de um erro, volte a disparar o evento.
              e.target.value = '';
              if (file)
                executar(
                  () => enviarArquivoDocumentoFiscal(prestacaoId, alvo.id, file),
                  'Não foi possível enviar o arquivo.',
                );
            }}
          />
        </label>
      )}

      {erro && <p className="mt-2 text-sm font-medium text-red-500">{erro}</p>}
    </fieldset>
  );
}
