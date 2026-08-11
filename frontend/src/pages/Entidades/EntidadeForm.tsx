import { useRef, useState } from 'react';
import { AlertCircle, ExternalLink, FileText, Loader2, Search, Trash2, Upload } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { FormularioNovo } from '@/components/ui/LabelCampo';
import { UF_OPTIONS } from '@/lib/ufs';
import {
  apenasDigitos,
  mascaraCelular,
  mascaraCep,
  mascaraCpfCnpj,
  mascaraInscricao,
  mascaraTelefoneFixo,
} from '@/lib/masks';
import { isCnpjValido, isEmailValido } from '@/lib/validators';
import { consultarCep } from '@/services/viacep.service';
import {
  abrirEstatuto,
  atualizarEntidade,
  criarEntidade,
  enviarEstatuto,
  removerEstatuto,
} from '@/services/entidades.service';
import { extrairCodigoErro, extrairMensagemErro } from '@/services/http';
import type { Entidade, EntidadePayload } from '@/types/entidade';

interface Props {
  entidade?: Entidade | null;
  onSuccess: () => void;
  onCancel: () => void;
}

/** Espelha o limite do backend (multer + use case). */
const MAX_ESTATUTO = 5 * 1024 * 1024;

function tamanhoLegivel(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

type Campos = {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  dataConstituicao: string;
  finalidadeDescricao: string;
  finalidadeArtigo: string;
  estatutoDataInicial: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  email: string;
  telefoneFixo: string;
  whatsapp: string;
};

function estadoInicial(e?: Entidade | null): Campos {
  return {
    razaoSocial: e?.razaoSocial ?? '',
    nomeFantasia: e?.nomeFantasia ?? '',
    cnpj: e?.cnpj ?? '',
    inscricaoEstadual: e?.inscricaoEstadual ?? '',
    inscricaoMunicipal: e?.inscricaoMunicipal ?? '',
    dataConstituicao: e?.dataConstituicao ? e.dataConstituicao.slice(0, 10) : '',
    finalidadeDescricao: e?.finalidadeDescricao ?? '',
    finalidadeArtigo: e?.finalidadeArtigo ?? '',
    estatutoDataInicial: e?.estatutoDataInicial ? e.estatutoDataInicial.slice(0, 10) : '',
    cep: e?.cep ?? '',
    logradouro: e?.logradouro ?? '',
    numero: e?.numero ?? '',
    complemento: e?.complemento ?? '',
    bairro: e?.bairro ?? '',
    cidade: e?.cidade ?? '',
    uf: e?.uf ?? '',
    email: e?.email ?? '',
    telefoneFixo: e?.telefoneFixo ?? '',
    whatsapp: e?.whatsapp ?? '',
  };
}

export function EntidadeForm({ entidade, onSuccess, onCancel }: Props) {
  const editando = !!entidade;
  const [form, setForm] = useState<Campos>(() => estadoInicial(entidade));
  const [erros, setErros] = useState<Partial<Record<keyof Campos, string>>>({});
  const [alerta, setAlerta] = useState<string | null>(null);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Estatuto: `arquivo` é o PDF recém-escolhido, ainda não enviado — o upload só
  // acontece depois de salvar, porque a rota precisa do id da entidade.
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [anexado, setAnexado] = useState<{ nome: string; tamanho: number } | null>(
    entidade?.estatutoArquivoNome
      ? { nome: entidade.estatutoArquivoNome, tamanho: entidade.estatutoArquivoTamanho ?? 0 }
      : null,
  );
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const inputArquivo = useRef<HTMLInputElement>(null);

  // Carimbada pelo backend quando o estatuto muda — aqui só é exibida.
  const dataAlteracaoEstatuto = entidade?.estatutoDataAlteracao
    ? new Date(entidade.estatutoDataAlteracao).toLocaleDateString('pt-BR')
    : '—';

  const set = (campo: keyof Campos, valor: string) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setErros((prev) => ({ ...prev, [campo]: undefined }));
    setAlerta(null);
  };

  function escolherArquivo(f: File | null) {
    setErroArquivo(null);
    if (!f) return setArquivo(null);
    if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) {
      setArquivo(null);
      return setErroArquivo('O estatuto precisa ser um arquivo PDF.');
    }
    if (f.size > MAX_ESTATUTO) {
      setArquivo(null);
      return setErroArquivo('O estatuto excede o limite de 5 MB.');
    }
    setArquivo(f);
  }

  async function handleRemoverEstatuto() {
    setErroArquivo(null);
    // Só há o que apagar no servidor se a entidade já existe e tinha anexo.
    if (editando && anexado) {
      try {
        await removerEstatuto(entidade!.id);
      } catch (e) {
        return setErroArquivo(extrairMensagemErro(e, 'Não foi possível remover o estatuto.'));
      }
    }
    setAnexado(null);
    setArquivo(null);
    if (inputArquivo.current) inputArquivo.current.value = '';
  }

  async function handleCepBlur() {
    if (apenasDigitos(form.cep).length !== 8) return;
    setBuscandoCep(true);
    try {
      const endereco = await consultarCep(form.cep);
      if (!endereco) {
        setErros((prev) => ({ ...prev, cep: 'CEP não encontrado.' }));
        return;
      }
      setForm((prev) => ({
        ...prev,
        logradouro: endereco.logradouro || prev.logradouro,
        bairro: endereco.bairro || prev.bairro,
        cidade: endereco.cidade || prev.cidade,
        uf: endereco.uf || prev.uf,
      }));
    } catch {
      setErros((prev) => ({ ...prev, cep: 'Falha ao consultar o CEP.' }));
    } finally {
      setBuscandoCep(false);
    }
  }

  function validar(): boolean {
    const novos: Partial<Record<keyof Campos, string>> = {};
    if (form.razaoSocial.trim().length < 2) novos.razaoSocial = 'Informe a razão social.';
    if (!isCnpjValido(form.cnpj)) novos.cnpj = 'CNPJ inválido.';
    if (apenasDigitos(form.cep).length !== 8) novos.cep = 'CEP inválido.';
    if (!form.logradouro.trim()) novos.logradouro = 'Informe o endereço.';
    if (!form.bairro.trim()) novos.bairro = 'Informe o bairro.';
    if (!form.cidade.trim()) novos.cidade = 'Informe a cidade.';
    if (!form.uf) novos.uf = 'UF.';
    if (!isEmailValido(form.email)) novos.email = 'E-mail inválido.';
    setErros(novos);
    return Object.keys(novos).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAlerta(null);
    if (!validar()) return;

    const payload: EntidadePayload = {
      razaoSocial: form.razaoSocial.trim(),
      nomeFantasia: form.nomeFantasia.trim() || null,
      cnpj: apenasDigitos(form.cnpj),
      inscricaoEstadual: form.inscricaoEstadual.trim() || null,
      inscricaoMunicipal: form.inscricaoMunicipal.trim() || null,
      dataConstituicao: form.dataConstituicao || null,
      finalidadeDescricao: form.finalidadeDescricao.trim() || null,
      finalidadeArtigo: form.finalidadeArtigo.trim() || null,
      estatutoDataInicial: form.estatutoDataInicial || null,
      cep: apenasDigitos(form.cep),
      logradouro: form.logradouro.trim(),
      numero: form.numero.trim() || null,
      complemento: form.complemento.trim() || null,
      bairro: form.bairro.trim(),
      cidade: form.cidade.trim(),
      uf: form.uf,
      email: form.email.trim().toLowerCase(),
      telefoneFixo: form.telefoneFixo ? apenasDigitos(form.telefoneFixo) : null,
      whatsapp: form.whatsapp ? apenasDigitos(form.whatsapp) : null,
    };

    setSalvando(true);
    try {
      const salva = editando
        ? await atualizarEntidade(entidade!.id, payload)
        : await criarEntidade(payload);

      // Upload em seguida: a rota do estatuto precisa do id, que no cadastro
      // novo só existe agora. Falhar aqui não desfaz o cadastro já gravado.
      if (arquivo) {
        try {
          await enviarEstatuto(salva.id, arquivo);
        } catch (e) {
          setSalvando(false);
          return setAlerta(
            `Cadastro salvo, mas o estatuto não foi anexado: ${extrairMensagemErro(e, 'falha no envio')}.`,
          );
        }
      }
      onSuccess();
    } catch (error) {
      const codigo = extrairCodigoErro(error);
      const msg = extrairMensagemErro(error, 'Não foi possível salvar a entidade.');
      if (codigo === 'CNPJ_DUPLICADO') setErros((prev) => ({ ...prev, cnpj: msg }));
      setAlerta(msg);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <FormularioNovo novo={!editando}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {alerta && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{alerta}</span>
          </div>
        )}

        {/* Grade de 12 colunas: cada campo ocupa só a largura que precisa,
            em vez de esticar até o fim da linha. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
          <div className="sm:col-span-5">
            <Input label="Razão Social *" name="razaoSocial" value={form.razaoSocial} onChange={(e) => set('razaoSocial', e.target.value)} error={erros.razaoSocial} />
          </div>
          <div className="sm:col-span-4">
            <Input label="Nome Fantasia" name="nomeFantasia" value={form.nomeFantasia} onChange={(e) => set('nomeFantasia', e.target.value)} />
          </div>
          <div className="sm:col-span-3">
            <Input
              label="CNPJ *"
              name="cnpj"
              value={mascaraCpfCnpj(form.cnpj)}
              onChange={(e) => set('cnpj', e.target.value)}
              error={erros.cnpj}
              placeholder="00.000.000/0000-00"
              inputMode="numeric"
            />
          </div>

          <div className="sm:col-span-4">
            <Input label="Inscrição Estadual" name="inscricaoEstadual" value={mascaraInscricao(form.inscricaoEstadual)} onChange={(e) => set('inscricaoEstadual', e.target.value)} placeholder="Isento ou nº" />
          </div>
          <div className="sm:col-span-4">
            <Input label="Inscrição Municipal" name="inscricaoMunicipal" value={mascaraInscricao(form.inscricaoMunicipal)} onChange={(e) => set('inscricaoMunicipal', e.target.value)} />
          </div>
          <div className="sm:col-span-4">
            <Input label="Data de Constituição" name="dataConstituicao" type="date" value={form.dataConstituicao} onChange={(e) => set('dataConstituicao', e.target.value)} />
          </div>

          {/* Finalidade estatutária */}
          <fieldset className="rounded-xl border border-ink-200 px-3 pb-3 dark:border-ink-700 sm:col-span-12">
            <legend className="px-1 text-sm font-medium text-ink-700 dark:text-ink-200">Finalidade Estatutária</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="sm:col-span-8">
                <label htmlFor="finalidadeDescricao" className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-300">Descrição</label>
                <textarea
                  id="finalidadeDescricao"
                  name="finalidadeDescricao"
                  value={form.finalidadeDescricao}
                  onChange={(e) => set('finalidadeDescricao', e.target.value)}
                  rows={2}
                  className="focus-ring w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400 transition-colors dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
                  placeholder="Finalidade da entidade conforme o estatuto."
                />
              </div>
              <div className="sm:col-span-4">
                <Input label="Artigo Estatuto" name="finalidadeArtigo" value={form.finalidadeArtigo} onChange={(e) => set('finalidadeArtigo', e.target.value)} placeholder="ex.: Art. 3º, II" />
              </div>
            </div>
          </fieldset>

          {/* Estatuto */}
          <fieldset className="rounded-xl border border-ink-200 px-3 pb-3 dark:border-ink-700 sm:col-span-12">
            <legend className="px-1 text-sm font-medium text-ink-700 dark:text-ink-200">Estatuto</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="sm:col-span-6">
                <span className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-300">Upload Estatuto</span>
                {anexado && !arquivo ? (
                  <div className="flex items-center gap-2 rounded-xl border border-ink-200 bg-ink-50/60 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-800/40">
                    <FileText className="h-4 w-4 shrink-0 text-ink-400" />
                    <span className="flex-1 truncate text-ink-700 dark:text-ink-200" title={anexado.nome}>{anexado.nome}</span>
                    {anexado.tamanho > 0 && <span className="text-xs text-ink-400">{tamanhoLegivel(anexado.tamanho)}</span>}
                    {editando && (
                      <button type="button" title="Abrir PDF" onClick={() => abrirEstatuto(entidade!.id).catch(() => setErroArquivo('Não foi possível abrir o PDF.'))} className="focus-ring rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800">
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    )}
                    <button type="button" title="Remover" onClick={handleRemoverEstatuto} className="focus-ring rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="focus-within:ring-2 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-ink-300 px-3 py-2 text-sm text-ink-500 transition-colors hover:border-brand-400 hover:text-ink-700 dark:border-ink-600 dark:text-ink-400 dark:hover:text-ink-200">
                    <Upload className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{arquivo ? arquivo.name : 'Selecionar o PDF do estatuto...'}</span>
                    {arquivo && <span className="text-xs text-ink-400">{tamanhoLegivel(arquivo.size)}</span>}
                    <input
                      ref={inputArquivo}
                      type="file"
                      accept="application/pdf,.pdf"
                      className="sr-only"
                      onChange={(e) => escolherArquivo(e.target.files?.[0] ?? null)}
                    />
                  </label>
                )}
                {erroArquivo && <p className="mt-1 text-xs font-medium text-red-500">{erroArquivo}</p>}
              </div>
              <div className="sm:col-span-3">
                <Input label="Data Inicial" name="estatutoDataInicial" type="date" value={form.estatutoDataInicial} onChange={(e) => set('estatutoDataInicial', e.target.value)} />
              </div>
              {/* Somente leitura: o sistema carimba a data quando o estatuto muda. */}
              <div className="sm:col-span-3">
                <Input
                  label="Data Alteração"
                  name="estatutoDataAlteracao"
                  value={dataAlteracaoEstatuto}
                  readOnly
                  tabIndex={-1}
                  className="cursor-default bg-ink-50 text-ink-500 dark:bg-ink-800/40 dark:text-ink-400"
                  hint="Automática."
                />
              </div>
            </div>
          </fieldset>

          {/* CEP e número ocupam o mínimo; o Endereço absorve o que sobra da linha. */}
          <div className="sm:col-span-2">
            <Input
              label="CEP *"
              name="cep"
              value={mascaraCep(form.cep)}
              onChange={(e) => set('cep', e.target.value)}
              onBlur={handleCepBlur}
              error={erros.cep}
              placeholder="00000-000"
              inputMode="numeric"
              rightSlot={buscandoCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            />
          </div>
          <div className="sm:col-span-8">
            <Input label="Endereço *" name="logradouro" value={form.logradouro} onChange={(e) => set('logradouro', e.target.value)} error={erros.logradouro} />
          </div>
          <div className="sm:col-span-2">
            <Input label="Número" name="numero" value={form.numero} onChange={(e) => set('numero', e.target.value)} placeholder="nº" />
          </div>

          <div className="sm:col-span-3">
            <Input label="Complemento" name="complemento" value={form.complemento} onChange={(e) => set('complemento', e.target.value)} placeholder="Sala, bloco..." />
          </div>
          <div className="sm:col-span-3">
            <Input label="Bairro *" name="bairro" value={form.bairro} onChange={(e) => set('bairro', e.target.value)} error={erros.bairro} />
          </div>
          <div className="sm:col-span-4">
            <Input label="Cidade *" name="cidade" value={form.cidade} onChange={(e) => set('cidade', e.target.value)} error={erros.cidade} />
          </div>
          <div className="sm:col-span-2">
            <Select label="UF *" name="uf" value={form.uf} onChange={(e) => set('uf', e.target.value)} error={erros.uf} options={UF_OPTIONS} placeholder="—" />
          </div>

          <div className="sm:col-span-6">
            <Input label="E-mail *" name="email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} error={erros.email} />
          </div>
          <div className="sm:col-span-3">
            <Input label="Telefone Fixo" name="telefoneFixo" value={mascaraTelefoneFixo(form.telefoneFixo)} onChange={(e) => set('telefoneFixo', e.target.value)} placeholder="(00) 0000-0000" inputMode="numeric" />
          </div>
          <div className="sm:col-span-3">
            <Input label="Celular / WhatsApp" name="whatsapp" value={mascaraCelular(form.whatsapp)} onChange={(e) => set('whatsapp', e.target.value)} placeholder="(00) 00000-0000" inputMode="numeric" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando}>
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
            {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Cadastrar Entidade'}
          </Button>
        </div>
      </form>
    </FormularioNovo>
  );
}
