import { useEffect, useState } from 'react';
import { ExternalLink, FileText, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { IconBtn, AlertaErro } from '@/pages/PrestacaoContas/blocos/_ui';
import { ConfirmarExclusao } from '@/pages/Ajustes/tabs/TermosAditivosTab';
import { extrairMensagemErro } from '@/services/http';
import {
  abrirArquivoDocumento,
  atualizarDocumentoRegularidade,
  criarDocumentoRegularidade,
  enviarArquivoDocumento,
  excluirDocumentoRegularidade,
  listarDocumentosRegularidade,
  removerArquivoDocumento,
} from '@/services/entidadeComplementos.service';
import {
  PAINEIS_REGULARIDADE,
  type DocumentoRegularidade,
  type DocumentoRegularidadePayload,
  type PainelRegularidade,
} from '@/types/entidadeComplementos';

const MAX_PDF = 5 * 1024 * 1024;

/**
 * Aba Regularidade Fiscal / Cadastral.
 *
 * Todos os painéis gravam na mesma tabela, distinguidos pelo `tipo`; o que muda
 * entre eles é só quais campos aparecem. Os oito primeiros são documento único
 * da entidade (editados no lugar); "Outras" acumula vários registros.
 */
export function RegularidadeTab({ entidadeId }: { entidadeId: string }) {
  const [documentos, setDocumentos] = useState<DocumentoRegularidade[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [excluindo, setExcluindo] = useState<DocumentoRegularidade | null>(null);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    listarDocumentosRegularidade(entidadeId)
      .then((r) => {
        if (!vivo) return;
        setDocumentos(r);
        setErro(null);
      })
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Falha ao carregar os documentos.')))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [entidadeId, refreshKey]);

  const recarregar = () => setRefreshKey((k) => k + 1);

  if (carregando) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-500 dark:text-ink-400">
        Certidões, certificados e declarações da entidade, com os respectivos arquivos.
      </p>

      {erro && <AlertaErro msg={erro} />}

      {PAINEIS_REGULARIDADE.map((painel) => (
        <Painel
          key={painel.tipo}
          entidadeId={entidadeId}
          painel={painel}
          documentos={documentos.filter((d) => d.tipo === painel.tipo)}
          onMudou={recarregar}
          onExcluir={setExcluindo}
        />
      ))}

      <ConfirmarExclusao
        aberto={!!excluindo}
        rotulo={excluindo ? `o documento ${excluindo.arquivoNome ?? ''}`.trim() : ''}
        onCancel={() => setExcluindo(null)}
        onConfirm={async () => {
          if (!excluindo) return;
          await excluirDocumentoRegularidade(entidadeId, excluindo.id);
          setExcluindo(null);
          recarregar();
        }}
      />
    </div>
  );
}

function Painel({
  entidadeId,
  painel,
  documentos,
  onMudou,
  onExcluir,
}: {
  entidadeId: string;
  painel: PainelRegularidade;
  documentos: DocumentoRegularidade[];
  onMudou: () => void;
  onExcluir: (d: DocumentoRegularidade) => void;
}) {
  return (
    <fieldset className="rounded-xl border border-ink-200 px-3 pb-3 pt-1 dark:border-ink-700">
      <legend className="px-1 text-sm font-medium text-ink-700 dark:text-ink-200">{painel.titulo}</legend>

      <div className="space-y-3">
        {documentos.map((doc) => (
          <Documento
            key={doc.id}
            entidadeId={entidadeId}
            painel={painel}
            documento={doc}
            onMudou={onMudou}
            onExcluir={painel.varios ? () => onExcluir(doc) : undefined}
          />
        ))}

        {/* Documento único ainda não cadastrado: o formulário aparece vazio,
            para preencher direto sem precisar clicar em "adicionar". */}
        {!painel.varios && documentos.length === 0 && (
          <Documento entidadeId={entidadeId} painel={painel} documento={null} onMudou={onMudou} />
        )}

        {painel.varios && <NovoOutras entidadeId={entidadeId} painel={painel} onMudou={onMudou} />}
      </div>
    </fieldset>
  );
}

function NovoOutras({
  entidadeId,
  painel,
  onMudou,
}: {
  entidadeId: string;
  painel: PainelRegularidade;
  onMudou: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  if (!aberto) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setAberto(true)}>
        <Plus className="h-4 w-4" />
        Adicionar documento
      </Button>
    );
  }
  return (
    <Documento
      entidadeId={entidadeId}
      painel={painel}
      documento={null}
      onMudou={() => {
        setAberto(false);
        onMudou();
      }}
      onCancelar={() => setAberto(false)}
    />
  );
}

function Documento({
  entidadeId,
  painel,
  documento,
  onMudou,
  onExcluir,
  onCancelar,
}: {
  entidadeId: string;
  painel: PainelRegularidade;
  documento: DocumentoRegularidade | null;
  onMudou: () => void;
  onExcluir?: () => void;
  onCancelar?: () => void;
}) {
  const [nome, setNome] = useState(documento?.arquivoNome ?? '');
  const [dataGeracao, setDataGeracao] = useState(documento?.dataGeracao ?? '');
  const [dataVencimento, setDataVencimento] = useState(documento?.dataVencimento ?? '');
  const [publicacao, setPublicacao] = useState(documento?.publicacao ?? '');
  const [orgaoEmissor, setOrgaoEmissor] = useState(documento?.orgaoEmissor ?? '');
  const [legislacao, setLegislacao] = useState(documento?.legislacao ?? '');
  const [data, setData] = useState(documento?.data ?? '');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [anexado, setAnexado] = useState(documento?.arquivoNome && documento?.arquivoTamanho ? documento.arquivoNome : null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const mostra = (c: PainelRegularidade['campos'][number]) => painel.campos.includes(c);

  function escolherArquivo(f: File | null) {
    setErro(null);
    if (!f) return setArquivo(null);
    if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) {
      setArquivo(null);
      return setErro('O documento precisa ser um arquivo PDF.');
    }
    if (f.size > MAX_PDF) {
      setArquivo(null);
      return setErro('O arquivo excede o limite de 5 MB.');
    }
    setArquivo(f);
    // O nome do arquivo vira o nome do documento quando ninguém digitou um.
    if (!nome.trim()) setNome(f.name);
  }

  async function salvar() {
    setErro(null);
    const payload: DocumentoRegularidadePayload = {
      tipo: painel.tipo,
      arquivoNome: nome.trim() || null,
      dataGeracao: dataGeracao || null,
      dataVencimento: dataVencimento || null,
      publicacao: publicacao.trim() || null,
      orgaoEmissor: orgaoEmissor.trim() || null,
      legislacao: legislacao.trim() || null,
      data: data || null,
    };

    setSalvando(true);
    try {
      const salvo = documento
        ? await atualizarDocumentoRegularidade(entidadeId, documento.id, payload)
        : await criarDocumentoRegularidade(entidadeId, payload);

      if (arquivo) await enviarArquivoDocumento(entidadeId, salvo.id, arquivo);
      onMudou();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível salvar o documento.'));
    } finally {
      setSalvando(false);
    }
  }

  async function removerAnexo() {
    if (!documento) {
      setArquivo(null);
      return setAnexado(null);
    }
    try {
      await removerArquivoDocumento(entidadeId, documento.id);
      setAnexado(null);
      setArquivo(null);
      onMudou();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível remover o arquivo.'));
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-ink-100 p-3 dark:border-ink-800">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
        <div className="sm:col-span-5">
          <Input label="Nome do Arquivo" name="arquivoNome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Preenchido pelo arquivo, se vazio" />
        </div>
        <div className="sm:col-span-7">
          <span className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-300">Arquivo PDF</span>
          {anexado && !arquivo ? (
            <div className="flex items-center gap-2 rounded-xl border border-ink-200 bg-ink-50/60 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-800/40">
              <FileText className="h-4 w-4 shrink-0 text-ink-400" />
              <span className="flex-1 truncate text-ink-700 dark:text-ink-200" title={anexado}>{anexado}</span>
              {documento && (
                <IconBtn title="Abrir PDF" onClick={() => abrirArquivoDocumento(entidadeId, documento.id)}>
                  <ExternalLink className="h-4 w-4" />
                </IconBtn>
              )}
              <IconBtn title="Remover arquivo" danger onClick={removerAnexo}>
                <Trash2 className="h-4 w-4" />
              </IconBtn>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-ink-300 px-3 py-2 text-sm text-ink-500 transition-colors hover:border-brand-400 hover:text-ink-700 dark:border-ink-600 dark:text-ink-400 dark:hover:text-ink-200">
              <Upload className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">{arquivo ? arquivo.name : 'Selecionar o PDF...'}</span>
              <input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => escolherArquivo(e.target.files?.[0] ?? null)} />
            </label>
          )}
        </div>

        {mostra('geracaoVencimento') && (
          <>
            <div className="sm:col-span-3">
              <Input label="Data da Geração" name="dataGeracao" type="date" value={dataGeracao} onChange={(e) => setDataGeracao(e.target.value)} />
            </div>
            <div className="sm:col-span-3">
              <Input label="Data do Vencimento" name="dataVencimento" type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} />
            </div>
          </>
        )}

        {mostra('publicacao') && (
          <div className="sm:col-span-6">
            <Input label="Publicação" name="publicacao" value={publicacao} onChange={(e) => setPublicacao(e.target.value)} />
          </div>
        )}

        {mostra('orgaoLegislacaoData') && (
          <>
            <div className="sm:col-span-4">
              <Input label="Órgão Emissor" name="orgaoEmissor" value={orgaoEmissor} onChange={(e) => setOrgaoEmissor(e.target.value)} />
            </div>
            <div className="sm:col-span-5">
              <Input label="Legislação" name="legislacao" value={legislacao} onChange={(e) => setLegislacao(e.target.value)} />
            </div>
            <div className="sm:col-span-3">
              <Input label="Data" name="data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
          </>
        )}
      </div>

      {erro && <p className="text-xs font-medium text-red-500">{erro}</p>}

      <div className="flex items-center justify-end gap-2">
        {onExcluir && (
          <IconBtn title="Excluir documento" danger onClick={onExcluir}>
            <Trash2 className="h-4 w-4" />
          </IconBtn>
        )}
        {onCancelar && (
          <Button type="button" size="sm" variant="secondary" onClick={onCancelar} disabled={salvando}>
            Cancelar
          </Button>
        )}
        <Button type="button" size="sm" onClick={salvar} disabled={salvando}>
          {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
          {salvando ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </div>
  );
}
