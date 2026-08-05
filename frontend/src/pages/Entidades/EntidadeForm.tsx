import { useState } from 'react';
import { AlertCircle, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
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
import { atualizarEntidade, criarEntidade } from '@/services/entidades.service';
import { extrairCodigoErro, extrairMensagemErro } from '@/services/http';
import type { Entidade, EntidadePayload } from '@/types/entidade';

interface Props {
  entidade?: Entidade | null;
  onSuccess: () => void;
  onCancel: () => void;
}

type Campos = {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  dataConstituicao: string;
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

  const set = (campo: keyof Campos, valor: string) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setErros((prev) => ({ ...prev, [campo]: undefined }));
    setAlerta(null);
  };

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
      if (editando) await atualizarEntidade(entidade!.id, payload);
      else await criarEntidade(payload);
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
    <form onSubmit={handleSubmit} className="space-y-5">
      {alerta && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{alerta}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input label="Razão Social *" name="razaoSocial" value={form.razaoSocial} onChange={(e) => set('razaoSocial', e.target.value)} error={erros.razaoSocial} />
        </div>
        <Input label="Nome Fantasia" name="nomeFantasia" value={form.nomeFantasia} onChange={(e) => set('nomeFantasia', e.target.value)} />
        <Input
          label="CNPJ *"
          name="cnpj"
          value={mascaraCpfCnpj(form.cnpj)}
          onChange={(e) => set('cnpj', e.target.value)}
          error={erros.cnpj}
          placeholder="00.000.000/0000-00"
          inputMode="numeric"
        />
        <Input label="Inscrição Estadual" name="inscricaoEstadual" value={mascaraInscricao(form.inscricaoEstadual)} onChange={(e) => set('inscricaoEstadual', e.target.value)} placeholder="Isento ou nº" />
        <Input label="Inscrição Municipal" name="inscricaoMunicipal" value={mascaraInscricao(form.inscricaoMunicipal)} onChange={(e) => set('inscricaoMunicipal', e.target.value)} />
        <Input label="Data de Constituição" name="dataConstituicao" type="date" value={form.dataConstituicao} onChange={(e) => set('dataConstituicao', e.target.value)} />

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
        <div className="grid grid-cols-1 gap-4 sm:col-span-1 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Input label="Endereço *" name="logradouro" value={form.logradouro} onChange={(e) => set('logradouro', e.target.value)} error={erros.logradouro} />
          </div>
          <Input label="Número" name="numero" value={form.numero} onChange={(e) => set('numero', e.target.value)} />
        </div>

        <Input label="Complemento" name="complemento" value={form.complemento} onChange={(e) => set('complemento', e.target.value)} />
        <Input label="Bairro *" name="bairro" value={form.bairro} onChange={(e) => set('bairro', e.target.value)} error={erros.bairro} />
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Input label="Cidade *" name="cidade" value={form.cidade} onChange={(e) => set('cidade', e.target.value)} error={erros.cidade} />
          </div>
          <Select label="UF *" name="uf" value={form.uf} onChange={(e) => set('uf', e.target.value)} error={erros.uf} options={UF_OPTIONS} placeholder="—" />
        </div>

        <Input label="E-mail *" name="email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} error={erros.email} />
        <Input label="Telefone Fixo" name="telefoneFixo" value={mascaraTelefoneFixo(form.telefoneFixo)} onChange={(e) => set('telefoneFixo', e.target.value)} placeholder="(00) 0000-0000" inputMode="numeric" />
        <Input label="Celular / WhatsApp" name="whatsapp" value={mascaraCelular(form.whatsapp)} onChange={(e) => set('whatsapp', e.target.value)} placeholder="(00) 00000-0000" inputMode="numeric" />
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
  );
}
