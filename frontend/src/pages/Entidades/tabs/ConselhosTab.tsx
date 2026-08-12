import { useEffect, useState } from 'react';
import { ExternalLink, FileText, Loader2, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { GradeSimples } from '@/components/ui/GradeSimples';
import { Select } from '@/components/ui/Select';
import type { ColunaDef } from '@/hooks/useResizableColumns';
import { FormularioNovo } from '@/components/ui/LabelCampo';
import { IconBtn, AlertaErro } from '@/pages/PrestacaoContas/blocos/_ui';
import { ConfirmarExclusao } from '@/pages/Ajustes/tabs/TermosAditivosTab';
import { dataBr } from '@/lib/masks';
import { extrairMensagemErro } from '@/services/http';
import {
  abrirAtaConselho,
  atualizarMembroConselho,
  criarMembroConselho,
  enviarAtaConselho,
  excluirMembroConselho,
  listarConselhos,
  removerAtaConselho,
} from '@/services/entidadeComplementos.service';
import {
  TIPO_CONSELHO_LABEL,
  type MembroConselho,
  type TipoConselho,
} from '@/types/entidadeComplementos';
import {
  CamposPessoa,
  PainelVigencia,
  pessoaInicial,
  pessoaPayload,
  validarPessoa,
  type ErrosPessoa,
  type EstadoPessoa,
} from './CamposPessoa';

type ModalState =
  | { tipo: 'fechado' }
  | { tipo: 'form'; membro: MembroConselho | null }
  | { tipo: 'excluir'; membro: MembroConselho };

const MAX_PDF = 5 * 1024 * 1024;

const OPCOES_CONSELHO = (Object.keys(TIPO_CONSELHO_LABEL) as TipoConselho[]).map((v) => ({
  value: v,
  label: TIPO_CONSELHO_LABEL[v],
}));

/** Ações sempre primeiro, como nas demais grades do sistema. */
const COLUNAS: ColunaDef[] = [
  { key: 'acoes', label: 'Ações', width: 100, minWidth: 90, align: 'center', movivel: false },
  { key: 'conselho', label: 'Conselho', width: 150, sortKey: 'tipoConselho' },
  { key: 'nome', label: 'Nome', width: 250, sortKey: 'nome' },
  { key: 'cargo', label: 'Função / Cargo', width: 180, sortKey: 'cargo' },
  { key: 'vigencia', label: 'Vigência', width: 200, sortKey: 'dataEntrada' },
  { key: 'ata', label: 'Ata', width: 200, sortKey: 'ataArquivoNome' },
];

export function ConselhosTab({ entidadeId }: { entidadeId: string }) {
  const [lista, setLista] = useState<MembroConselho[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ tipo: 'fechado' });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    listarConselhos(entidadeId)
      .then((r) => {
        if (!vivo) return;
        setLista(r);
        setErro(null);
      })
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Falha ao carregar os conselhos.')))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [entidadeId, refreshKey]);

  const recarregar = () => {
    setModal({ tipo: 'fechado' });
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500 dark:text-ink-400">
          Membros dos conselhos de administração, fiscal e especiais.
        </p>
        <Button size="sm" onClick={() => setModal({ tipo: 'form', membro: null })}>
          <Plus className="h-4 w-4" />
          Adicionar membro
        </Button>
      </div>

      {erro && <AlertaErro msg={erro} />}

      <GradeSimples
        storageKey="@SolucaoTS:grid:conselhos:v1"
        colunas={COLUNAS}
        dados={lista}
        chave={(m) => m.id}
        carregando={carregando}
        vazio="Nenhum membro cadastrado."
        onDuploClique={(m) => setModal({ tipo: 'form', membro: m })}
        valorOrdenacao={(campo, m) => {
          if (campo === 'tipoConselho') return TIPO_CONSELHO_LABEL[m.tipoConselho];
          if (campo === 'nome') return m.nome;
          if (campo === 'cargo') return m.cargo;
          if (campo === 'dataEntrada') return m.dataEntrada;
          if (campo === 'ataArquivoNome') return m.ataArquivoNome;
          return null;
        }}
        renderCell={(coluna, m) => {
          switch (coluna) {
            case 'acoes':
              return (
                <div className="flex items-center justify-center gap-1">
                  <IconBtn title="Editar" onClick={() => setModal({ tipo: 'form', membro: m })}>
                    <Pencil className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn title="Excluir" danger onClick={() => setModal({ tipo: 'excluir', membro: m })}>
                    <Trash2 className="h-4 w-4" />
                  </IconBtn>
                </div>
              );
            case 'conselho':
              return <Badge tone="brand">{TIPO_CONSELHO_LABEL[m.tipoConselho]}</Badge>;
            case 'nome':
              return <span className="block truncate font-medium text-ink-800 dark:text-ink-100" title={m.nome}>{m.nome}</span>;
            case 'cargo':
              return <span className="block truncate text-ink-600 dark:text-ink-300">{m.cargo || '—'}</span>;
            case 'vigencia':
              return (
                <span className="block truncate text-ink-600 dark:text-ink-300">
                  {m.dataEntrada ? dataBr(m.dataEntrada) : '—'} — {m.dataSaida ? dataBr(m.dataSaida) : 'atual'}
                </span>
              );
            case 'ata':
              return m.ataArquivoNome ? (
                <button
                  type="button"
                  onClick={() => abrirAtaConselho(entidadeId, m.id)}
                  className="focus-ring flex w-full min-w-0 items-center gap-1 rounded text-brand-600 hover:underline dark:text-brand-400"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate" title={m.ataArquivoNome}>{m.ataArquivoNome}</span>
                </button>
              ) : (
                <span className="text-ink-400">—</span>
              );
            default:
              return null;
          }
        }}
      />

      <Modal
        open={modal.tipo === 'form'}
        onClose={() => setModal({ tipo: 'fechado' })}
        title={modal.tipo === 'form' && modal.membro ? 'Editar Membro do Conselho' : 'Novo Membro do Conselho'}
        size="2xl"
      >
        {modal.tipo === 'form' && (
          <MembroForm
            entidadeId={entidadeId}
            membro={modal.membro}
            onSuccess={recarregar}
            onCancel={() => setModal({ tipo: 'fechado' })}
          />
        )}
      </Modal>

      <ConfirmarExclusao
        aberto={modal.tipo === 'excluir'}
        rotulo={modal.tipo === 'excluir' ? `o membro ${modal.membro.nome}` : ''}
        onCancel={() => setModal({ tipo: 'fechado' })}
        onConfirm={async () => {
          if (modal.tipo !== 'excluir') return;
          await excluirMembroConselho(entidadeId, modal.membro.id);
          recarregar();
        }}
      />
    </div>
  );
}

function MembroForm({
  entidadeId,
  membro,
  onSuccess,
  onCancel,
}: {
  entidadeId: string;
  membro: MembroConselho | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [tipo, setTipo] = useState<string>(membro?.tipoConselho ?? '');
  const [erroTipo, setErroTipo] = useState<string | undefined>();
  const [pessoa, setPessoa] = useState<EstadoPessoa>(() => pessoaInicial(membro));
  const [erros, setErros] = useState<ErrosPessoa>({});
  const [nomeacao, setNomeacao] = useState(membro?.ataDataNomeacao ?? '');
  const [registro, setRegistro] = useState(membro?.ataDataRegistro ?? '');
  const [local, setLocal] = useState(membro?.ataLocalRegistro ?? '');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [anexado, setAnexado] = useState(membro?.ataArquivoNome ?? null);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const [alerta, setAlerta] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const set = (campo: keyof EstadoPessoa, valor: string) => {
    setPessoa((p) => ({ ...p, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  };

  function escolherArquivo(f: File | null) {
    setErroArquivo(null);
    if (!f) return setArquivo(null);
    if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) {
      setArquivo(null);
      return setErroArquivo('A ata precisa ser um arquivo PDF.');
    }
    if (f.size > MAX_PDF) {
      setArquivo(null);
      return setErroArquivo('O arquivo excede o limite de 5 MB.');
    }
    setArquivo(f);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setAlerta(null);
    const novos = validarPessoa(pessoa);
    setErros(novos);
    if (!tipo) setErroTipo('Selecione o tipo de conselho.');
    if (Object.keys(novos).length || !tipo) return;

    const payload = {
      ...pessoaPayload(pessoa),
      tipoConselho: tipo as TipoConselho,
      ataDataNomeacao: nomeacao || null,
      ataDataRegistro: registro || null,
      ataLocalRegistro: local.trim() || null,
    };

    setSalvando(true);
    try {
      const salvo = membro
        ? await atualizarMembroConselho(entidadeId, membro.id, payload)
        : await criarMembroConselho(entidadeId, payload);

      // O anexo sobe depois: num membro novo o id só existe agora.
      if (arquivo) {
        try {
          await enviarAtaConselho(entidadeId, salvo.id, arquivo);
        } catch (err) {
          setSalvando(false);
          return setAlerta(
            `Membro salvo, mas a ata não foi anexada: ${extrairMensagemErro(err, 'falha no envio')}.`,
          );
        }
      }
      onSuccess();
    } catch (err) {
      setAlerta(extrairMensagemErro(err, 'Não foi possível salvar o membro.'));
    } finally {
      setSalvando(false);
    }
  }

  async function removerAnexo() {
    if (!membro) {
      setArquivo(null);
      return setAnexado(null);
    }
    try {
      await removerAtaConselho(entidadeId, membro.id);
      setAnexado(null);
      setArquivo(null);
    } catch (e) {
      setErroArquivo(extrairMensagemErro(e, 'Não foi possível remover a ata.'));
    }
  }

  return (
    <FormularioNovo novo={!membro}>
      <form onSubmit={salvar} className="space-y-4">
        {alerta && <AlertaErro msg={alerta} />}

        <div className="sm:w-1/3">
          <Select
            label="Tipo de Conselho *"
            name="tipoConselho"
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value);
              setErroTipo(undefined);
            }}
            error={erroTipo}
            options={OPCOES_CONSELHO}
            placeholder="Selecione..."
          />
        </div>

        <CamposPessoa
          valores={pessoa}
          erros={erros}
          set={set}
          preencher={(parcial) => setPessoa((p) => ({ ...p, ...parcial }))}
        />

        <PainelVigencia valores={pessoa} erros={erros} set={set} />

        <fieldset className="rounded-xl border border-ink-200 px-3 pb-3 dark:border-ink-700">
          <legend className="px-1 text-sm font-medium text-ink-700 dark:text-ink-200">Ata de Nomeação</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
            <div className="sm:col-span-3">
              <Input label="Data da Nomeação" name="ataDataNomeacao" type="date" value={nomeacao} onChange={(e) => setNomeacao(e.target.value)} />
            </div>
            <div className="sm:col-span-3">
              <Input label="Data do Registro" name="ataDataRegistro" type="date" value={registro} onChange={(e) => setRegistro(e.target.value)} />
            </div>
            <div className="sm:col-span-6">
              <Input label="Local do Registro" name="ataLocalRegistro" value={local} onChange={(e) => setLocal(e.target.value)} placeholder="ex.: 1º Cartório de Títulos" />
            </div>

            <div className="sm:col-span-12">
              <span className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-300">Arquivo PDF</span>
              {anexado && !arquivo ? (
                <div className="flex items-center gap-2 rounded-xl border border-ink-200 bg-ink-50/60 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-800/40">
                  <FileText className="h-4 w-4 shrink-0 text-ink-400" />
                  <span className="flex-1 truncate text-ink-700 dark:text-ink-200" title={anexado}>{anexado}</span>
                  {membro && (
                    <IconBtn title="Abrir PDF" onClick={() => abrirAtaConselho(entidadeId, membro.id)}>
                      <ExternalLink className="h-4 w-4" />
                    </IconBtn>
                  )}
                  <IconBtn title="Remover" danger onClick={removerAnexo}>
                    <Trash2 className="h-4 w-4" />
                  </IconBtn>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-ink-300 px-3 py-2 text-sm text-ink-500 transition-colors hover:border-brand-400 hover:text-ink-700 dark:border-ink-600 dark:text-ink-400 dark:hover:text-ink-200">
                  <Upload className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{arquivo ? arquivo.name : 'Selecionar o PDF da ata...'}</span>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    className="sr-only"
                    onChange={(e) => escolherArquivo(e.target.files?.[0] ?? null)}
                  />
                </label>
              )}
              {erroArquivo && <p className="mt-1 text-xs font-medium text-red-500">{erroArquivo}</p>}
            </div>
          </div>
        </fieldset>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando}>
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
            {salvando ? 'Salvando...' : membro ? 'Salvar Alterações' : 'Cadastrar Membro'}
          </Button>
        </div>
      </form>
    </FormularioNovo>
  );
}
