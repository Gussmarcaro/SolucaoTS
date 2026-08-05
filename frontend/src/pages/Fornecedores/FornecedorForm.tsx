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
  tipoDocumento,
} from '@/lib/masks';
import { isDocumentoValido, isEmailValido } from '@/lib/validators';
import { consultarCep } from '@/services/viacep.service';
import { atualizarFornecedor, criarFornecedor } from '@/services/fornecedores.service';
import { extrairCodigoErro, extrairMensagemErro } from '@/services/http';
import type { Fornecedor, FornecedorPayload } from '@/types/fornecedor';

interface Props {
  fornecedor?: Fornecedor | null;
  onSuccess: () => void;
  onCancel: () => void;
}

type Campos = {
  nome: string;
  documento: string;
  inscricaoEstadual: string;
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

function estadoInicial(f?: Fornecedor | null): Campos {
  return {
    nome: f?.nome ?? '',
    documento: f?.documento ?? '',
    inscricaoEstadual: f?.inscricaoEstadual ?? '',
    cep: f?.cep ?? '',
    logradouro: f?.logradouro ?? '',
    numero: f?.numero ?? '',
    complemento: f?.complemento ?? '',
    bairro: f?.bairro ?? '',
    cidade: f?.cidade ?? '',
    uf: f?.uf ?? '',
    email: f?.email ?? '',
    telefoneFixo: f?.telefoneFixo ?? '',
    whatsapp: f?.whatsapp ?? '',
  };
}

export function FornecedorForm({ fornecedor, onSuccess, onCancel }: Props) {
  const editando = !!fornecedor;
  const [form, setForm] = useState<Campos>(() => estadoInicial(fornecedor));
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
    if (form.nome.trim().length < 2) novos.nome = 'Informe o nome / razão social.';
    if (!isDocumentoValido(form.documento)) novos.documento = 'CPF/CNPJ inválido.';
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

    const payload: FornecedorPayload = {
      nome: form.nome.trim(),
      documento: apenasDigitos(form.documento),
      documentoTipo: tipoDocumento(form.documento),
      inscricaoEstadual: form.inscricaoEstadual.trim() || null,
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
      if (editando) await atualizarFornecedor(fornecedor!.id, payload);
      else await criarFornecedor(payload);
      onSuccess();
    } catch (error) {
      const codigo = extrairCodigoErro(error);
      const msg = extrairMensagemErro(error, 'Não foi possível salvar o fornecedor.');
      if (codigo === 'DOCUMENTO_DUPLICADO') setErros((prev) => ({ ...prev, documento: msg }));
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
          <Input label="Nome / Razão Social *" name="nome" value={form.nome} onChange={(e) => set('nome', e.target.value)} error={erros.nome} />
        </div>
        <Input
          label="CPF / CNPJ *"
          name="documento"
          value={mascaraCpfCnpj(form.documento)}
          onChange={(e) => set('documento', e.target.value)}
          error={erros.documento}
          placeholder="000.000.000-00"
          inputMode="numeric"
        />
        <Input label="Inscrição Estadual" name="inscricaoEstadual" value={mascaraInscricao(form.inscricaoEstadual)} onChange={(e) => set('inscricaoEstadual', e.target.value)} placeholder="Isento ou nº" />

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
          {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}
        </Button>
      </div>
    </form>
  );
}
