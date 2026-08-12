import { useEffect, useState } from 'react';
import { ExternalLink, FileText, Loader2, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { GradeSimples } from '@/components/ui/GradeSimples';
import { SlideButton } from '@/components/ui/SlideButton';
import type { ColunaDef } from '@/hooks/useResizableColumns';
import { FormularioNovo } from '@/components/ui/LabelCampo';
import { IconBtn, AlertaErro } from '@/pages/PrestacaoContas/blocos/_ui';
import { ConfirmarExclusao } from '@/pages/Ajustes/tabs/TermosAditivosTab';
import { dataBr, formatarMoeda, mascaraMoeda, moedaParaNumero, numeroParaMascaraMoeda } from '@/lib/masks';
import { extrairMensagemErro } from '@/services/http';
import {
  abrirAtaDiretoria,
  atualizarMembroDiretoria,
  criarMembroDiretoria,
  enviarAtaDiretoria,
  excluirAtaDiretoria,
  excluirMembroDiretoria,
  listarAtasDiretoria,
  listarDiretoria,
} from '@/services/entidadeComplementos.service';
import type {
  AtaDiretoriaArquivo,
  MembroDiretoria,
  ValorRemuneracao,
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
  | { tipo: 'form'; membro: MembroDiretoria | null }
  | { tipo: 'excluir'; membro: MembroDiretoria }
  | { tipo: 'excluirAta'; ata: AtaDiretoriaArquivo };

/** Ações sempre primeiro, como nas demais grades do sistema. */
const COLUNAS: ColunaDef[] = [
  { key: 'acoes', label: 'Ações', width: 100, minWidth: 90, align: 'center', movivel: false },
  { key: 'nome', label: 'Nome', width: 280, sortKey: 'nome' },
  { key: 'cargo', label: 'Função / Cargo', width: 200, sortKey: 'cargo' },
  { key: 'vigencia', label: 'Vigência', width: 210, sortKey: 'dataEntrada' },
  { key: 'remuneracao', label: 'Remuneração', width: 130, align: 'center', sortKey: 'possuiRemuneracao' },
];

const MAX_PDF = 5 * 1024 * 1024;

function tamanhoLegivel(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function DiretoriaTab({ entidadeId }: { entidadeId: string }) {
  const [lista, setLista] = useState<MembroDiretoria[]>([]);
  const [atas, setAtas] = useState<AtaDiretoriaArquivo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ tipo: 'fechado' });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    Promise.all([listarDiretoria(entidadeId), listarAtasDiretoria(entidadeId)])
      .then(([membros, arquivos]) => {
        if (!vivo) return;
        setLista(membros);
        setAtas(arquivos);
        setErro(null);
      })
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Falha ao carregar a diretoria.')))
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
          Membros da diretoria da entidade e as atas que os elegeram.
        </p>
        <Button size="sm" onClick={() => setModal({ tipo: 'form', membro: null })}>
          <Plus className="h-4 w-4" />
          Adicionar membro
        </Button>
      </div>

      {erro && <AlertaErro msg={erro} />}

      <GradeSimples
        storageKey="@SolucaoTS:grid:diretoria:v1"
        colunas={COLUNAS}
        dados={lista}
        chave={(m) => m.id}
        carregando={carregando}
        vazio="Nenhum membro cadastrado."
        onDuploClique={(m) => setModal({ tipo: 'form', membro: m })}
        valorOrdenacao={(campo, m) => {
          if (campo === 'nome') return m.nome;
          if (campo === 'cargo') return m.cargo;
          if (campo === 'dataEntrada') return m.dataEntrada;
          if (campo === 'possuiRemuneracao') return m.possuiRemuneracao ? 'Sim' : 'Não';
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
            case 'remuneracao':
              return (
                <span className="text-ink-600 dark:text-ink-300">{m.possuiRemuneracao ? 'Sim' : 'Não'}</span>
              );
            default:
              return null;
          }
        }}
      />

      <ArquivosAtas
        entidadeId={entidadeId}
        atas={atas}
        onMudou={() => setRefreshKey((k) => k + 1)}
        onExcluir={(ata) => setModal({ tipo: 'excluirAta', ata })}
      />

      <Modal
        open={modal.tipo === 'form'}
        onClose={() => setModal({ tipo: 'fechado' })}
        title={modal.tipo === 'form' && modal.membro ? 'Editar Membro da Diretoria' : 'Novo Membro da Diretoria'}
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
          await excluirMembroDiretoria(entidadeId, modal.membro.id);
          recarregar();
        }}
      />

      <ConfirmarExclusao
        aberto={modal.tipo === 'excluirAta'}
        rotulo={modal.tipo === 'excluirAta' ? `a ata ${modal.ata.arquivoNome}` : ''}
        onCancel={() => setModal({ tipo: 'fechado' })}
        onConfirm={async () => {
          if (modal.tipo !== 'excluirAta') return;
          await excluirAtaDiretoria(entidadeId, modal.ata.id);
          recarregar();
        }}
      />
    </div>
  );
}

/** Painel de arquivos: várias atas de eleição por entidade. */
function ArquivosAtas({
  entidadeId,
  atas,
  onMudou,
  onExcluir,
}: {
  entidadeId: string;
  atas: AtaDiretoriaArquivo[];
  onMudou: () => void;
  onExcluir: (ata: AtaDiretoriaArquivo) => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(arquivo: File | null) {
    setErro(null);
    if (!arquivo) return;
    if (arquivo.type !== 'application/pdf' && !/\.pdf$/i.test(arquivo.name))
      return setErro('A ata precisa ser um arquivo PDF.');
    if (arquivo.size > MAX_PDF) return setErro('O arquivo excede o limite de 5 MB.');
    setEnviando(true);
    try {
      await enviarAtaDiretoria(entidadeId, arquivo);
      onMudou();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível enviar a ata.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <fieldset className="rounded-xl border border-ink-200 px-3 pb-3 dark:border-ink-700">
      <legend className="px-1 text-sm font-medium text-ink-700 dark:text-ink-200">Arquivos</legend>
      <div className="space-y-2">
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-ink-300 px-3 py-2 text-sm text-ink-500 transition-colors hover:border-brand-400 hover:text-ink-700 dark:border-ink-600 dark:text-ink-400 dark:hover:text-ink-200">
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 shrink-0" />}
          <span className="flex-1">
            {enviando ? 'Enviando...' : 'Anexar ata de eleição da diretoria (PDF)'}
          </span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            disabled={enviando}
            onChange={(e) => {
              enviar(e.target.files?.[0] ?? null);
              e.target.value = '';
            }}
          />
        </label>

        {erro && <p className="text-xs font-medium text-red-500">{erro}</p>}

        {atas.length === 0 ? (
          <p className="text-xs text-ink-400">Nenhuma ata anexada.</p>
        ) : (
          <ul className="space-y-1.5">
            {atas.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-2 rounded-xl border border-ink-200 bg-ink-50/60 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-800/40"
              >
                <FileText className="h-4 w-4 shrink-0 text-ink-400" />
                <span className="flex-1 truncate text-ink-700 dark:text-ink-200" title={a.arquivoNome}>
                  {a.arquivoNome}
                </span>
                <span className="text-xs text-ink-400">{tamanhoLegivel(a.arquivoTamanho)}</span>
                <IconBtn title="Abrir PDF" onClick={() => abrirAtaDiretoria(entidadeId, a.id)}>
                  <ExternalLink className="h-4 w-4" />
                </IconBtn>
                <IconBtn title="Excluir" danger onClick={() => onExcluir(a)}>
                  <Trash2 className="h-4 w-4" />
                </IconBtn>
              </li>
            ))}
          </ul>
        )}
      </div>
    </fieldset>
  );
}

function MembroForm({
  entidadeId,
  membro,
  onSuccess,
  onCancel,
}: {
  entidadeId: string;
  membro: MembroDiretoria | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [pessoa, setPessoa] = useState<EstadoPessoa>(() => pessoaInicial(membro));
  const [erros, setErros] = useState<ErrosPessoa>({});
  const [ataEleicao, setAtaEleicao] = useState(membro?.ataDataEleicao ?? '');
  const [ataRegistro, setAtaRegistro] = useState(membro?.ataDataRegistro ?? '');
  const [ataLocal, setAtaLocal] = useState(membro?.ataLocalRegistro ?? '');
  const [remunerado, setRemunerado] = useState(membro?.possuiRemuneracao ?? false);
  const [remDescricao, setRemDescricao] = useState(membro?.remuneracaoDescricao ?? '');
  const [remArtigo, setRemArtigo] = useState(membro?.remuneracaoArtigo ?? '');
  const [valores, setValores] = useState<ValorRemuneracao[]>(membro?.remuneracaoValores ?? []);
  const [alerta, setAlerta] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const set = (campo: keyof EstadoPessoa, valor: string) => {
    setPessoa((p) => ({ ...p, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  };

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setAlerta(null);
    const novos = validarPessoa(pessoa);
    setErros(novos);
    if (Object.keys(novos).length) return;

    const payload = {
      ...pessoaPayload(pessoa),
      ataDataEleicao: ataEleicao || null,
      ataDataRegistro: ataRegistro || null,
      ataLocalRegistro: ataLocal.trim() || null,
      possuiRemuneracao: remunerado,
      remuneracaoDescricao: remDescricao.trim() || null,
      remuneracaoArtigo: remArtigo.trim() || null,
      remuneracaoValores: valores.filter((v) => v.descricao.trim() || v.valor > 0),
    };

    setSalvando(true);
    try {
      if (membro) await atualizarMembroDiretoria(entidadeId, membro.id, payload);
      else await criarMembroDiretoria(entidadeId, payload);
      onSuccess();
    } catch (err) {
      setAlerta(extrairMensagemErro(err, 'Não foi possível salvar o membro.'));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <FormularioNovo novo={!membro}>
      <form onSubmit={salvar} className="space-y-4">
        {alerta && <AlertaErro msg={alerta} />}

        <CamposPessoa
          valores={pessoa}
          erros={erros}
          set={set}
          preencher={(parcial) => setPessoa((p) => ({ ...p, ...parcial }))}
        />

        <PainelVigencia valores={pessoa} erros={erros} set={set} />

        <fieldset className="rounded-xl border border-ink-200 px-3 pb-3 dark:border-ink-700">
          <legend className="px-1 text-sm font-medium text-ink-700 dark:text-ink-200">Ata de Eleição</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input label="Data da Eleição" name="ataDataEleicao" type="date" value={ataEleicao} onChange={(e) => setAtaEleicao(e.target.value)} />
            <Input label="Data do Registro" name="ataDataRegistro" type="date" value={ataRegistro} onChange={(e) => setAtaRegistro(e.target.value)} />
            <Input label="Local do Registro" name="ataLocalRegistro" value={ataLocal} onChange={(e) => setAtaLocal(e.target.value)} placeholder="ex.: 1º Cartório de Títulos" />
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-ink-200 px-3 pb-3 dark:border-ink-700">
          <legend className="px-1 text-sm font-medium text-ink-700 dark:text-ink-200">Possui Remuneração</legend>
          <div className="space-y-3">
            <SlideButton name="possuiRemuneracao" checked={remunerado} onChange={setRemunerado} />

            {/* Só aparece quando há remuneração: sem ela, previsão e valores não
                têm o que registrar (e o backend limpa os campos). */}
            {remunerado && (
              <>
                <fieldset className="rounded-xl border border-ink-200 px-3 pb-3 dark:border-ink-700">
                  <legend className="px-1 text-sm font-medium text-ink-700 dark:text-ink-200">Previsão Estatutária</legend>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                    <div className="sm:col-span-8">
                      <Input label="Descrição" name="remuneracaoDescricao" value={remDescricao} onChange={(e) => setRemDescricao(e.target.value)} />
                    </div>
                    <div className="sm:col-span-4">
                      <Input label="Artigo" name="remuneracaoArtigo" value={remArtigo} onChange={(e) => setRemArtigo(e.target.value)} placeholder="ex.: Art. 12, § 2º" />
                    </div>
                  </div>
                </fieldset>

                <ValoresRemuneracao valores={valores} onChange={setValores} />
              </>
            )}
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

/**
 * Seção Valores. Os campos definitivos ainda não foram definidos, então cada
 * linha é só descrição + valor e o conjunto é gravado como Json — acrescentar
 * um campo aqui não exige migração no banco.
 */
function ValoresRemuneracao({
  valores,
  onChange,
}: {
  valores: ValorRemuneracao[];
  onChange: (v: ValorRemuneracao[]) => void;
}) {
  const alterar = (i: number, parcial: Partial<ValorRemuneracao>) =>
    onChange(valores.map((v, j) => (j === i ? { ...v, ...parcial } : v)));

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-ink-700 dark:text-ink-200">Valores</span>
        <Button size="sm" variant="secondary" onClick={() => onChange([...valores, { descricao: '', valor: 0 }])}>
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </div>
      {valores.length === 0 ? (
        <p className="text-xs text-ink-400">Nenhum valor informado.</p>
      ) : (
        <div className="space-y-2">
          {valores.map((v, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  label={i === 0 ? 'Descrição' : ''}
                  name={`valorDescricao-${i}`}
                  value={v.descricao}
                  onChange={(e) => alterar(i, { descricao: e.target.value })}
                  placeholder="ex.: Pró-labore mensal"
                />
              </div>
              <div className="w-40">
                <Input
                  label={i === 0 ? 'Valor (R$)' : ''}
                  name={`valor-${i}`}
                  value={numeroParaMascaraMoeda(v.valor)}
                  onChange={(e) => alterar(i, { valor: moedaParaNumero(mascaraMoeda(e.target.value)) })}
                  inputMode="numeric"
                />
              </div>
              <IconBtn title="Remover" danger onClick={() => onChange(valores.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4" />
              </IconBtn>
            </div>
          ))}
          <p className="text-right text-xs text-ink-400">
            Total: {formatarMoeda(valores.reduce((s, v) => s + (v.valor || 0), 0))}
          </p>
        </div>
      )}
    </div>
  );
}
