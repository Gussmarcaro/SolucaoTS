import { useState } from 'react';
import { AlertCircle, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PasswordStrength } from '@/components/ui/PasswordStrength';
import { UF_OPTIONS } from '@/lib/ufs';
import {
  apenasDigitos,
  mascaraCelular,
  mascaraCep,
  mascaraCpfCnpj,
  tipoDocumento,
} from '@/lib/masks';
import { isDocumentoValido, isEmailValido, isSenhaForte } from '@/lib/validators';
import { consultarCep } from '@/services/viacep.service';
import { criarUsuario } from '@/services/usuarios.service';
import { extrairCodigoErro, extrairMensagemErro } from '@/services/http';
import type { CriarUsuarioPayload } from '@/types/usuario';

interface UsuarioFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

type Campos = {
  nome: string;
  documento: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  email: string;
  celular: string;
  senha: string;
  confirmarSenha: string;
};

const inicial: Campos = {
  nome: '', documento: '', cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
  email: '', celular: '', senha: '', confirmarSenha: '',
};

export function UsuarioForm({ onSuccess, onCancel }: UsuarioFormProps) {
  const [form, setForm] = useState<Campos>(inicial);
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
      setErros((prev) => ({ ...prev, cep: undefined, logradouro: undefined, bairro: undefined, cidade: undefined, uf: undefined }));
    } catch {
      setErros((prev) => ({ ...prev, cep: 'Falha ao consultar o CEP.' }));
    } finally {
      setBuscandoCep(false);
    }
  }

  function validar(): boolean {
    const novos: Partial<Record<keyof Campos, string>> = {};
    if (form.nome.trim().length < 3) novos.nome = 'Informe o nome completo / razão social.';
    if (!isDocumentoValido(form.documento)) novos.documento = 'CPF/CNPJ inválido.';
    if (apenasDigitos(form.cep).length !== 8) novos.cep = 'CEP inválido.';
    if (!form.logradouro.trim()) novos.logradouro = 'Informe o endereço.';
    if (!form.bairro.trim()) novos.bairro = 'Informe o bairro.';
    if (!form.cidade.trim()) novos.cidade = 'Informe a cidade.';
    if (!form.uf) novos.uf = 'Selecione a UF.';
    if (!isEmailValido(form.email)) novos.email = 'E-mail inválido.';
    if (apenasDigitos(form.celular).length < 10) novos.celular = 'Celular inválido.';
    if (!isSenhaForte(form.senha)) novos.senha = 'A senha não atende aos requisitos.';
    if (form.senha !== form.confirmarSenha) novos.confirmarSenha = 'As senhas não conferem.';
    setErros(novos);
    return Object.keys(novos).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAlerta(null);
    if (!validar()) return;

    const payload: CriarUsuarioPayload = {
      nome: form.nome.trim(),
      documento: apenasDigitos(form.documento),
      documentoTipo: tipoDocumento(form.documento),
      cep: apenasDigitos(form.cep),
      logradouro: form.logradouro.trim(),
      numero: form.numero.trim() || null,
      complemento: form.complemento.trim() || null,
      bairro: form.bairro.trim(),
      cidade: form.cidade.trim(),
      uf: form.uf,
      email: form.email.trim().toLowerCase(),
      celular: apenasDigitos(form.celular),
      senha: form.senha,
      confirmarSenha: form.confirmarSenha,
    };

    setSalvando(true);
    try {
      await criarUsuario(payload);
      onSuccess();
    } catch (error) {
      const codigo = extrairCodigoErro(error);
      const msg = extrairMensagemErro(error, 'Não foi possível salvar o cadastro.');
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
          <Input
            label="Nome Completo / Razão Social"
            name="nome"
            value={form.nome}
            onChange={(e) => set('nome', e.target.value)}
            error={erros.nome}
            placeholder="Ex.: Instituto Vida e Saúde"
          />
        </div>

        <Input
          label="CPF / CNPJ"
          name="documento"
          value={mascaraCpfCnpj(form.documento)}
          onChange={(e) => set('documento', e.target.value)}
          error={erros.documento}
          placeholder="000.000.000-00"
          inputMode="numeric"
        />

        <Input
          label="CEP"
          name="cep"
          value={mascaraCep(form.cep)}
          onChange={(e) => set('cep', e.target.value)}
          onBlur={handleCepBlur}
          error={erros.cep}
          placeholder="00000-000"
          inputMode="numeric"
          hint="Preenche o endereço automaticamente"
          rightSlot={
            buscandoCep ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Input
              label="Endereço (Logradouro)"
              name="logradouro"
              value={form.logradouro}
              onChange={(e) => set('logradouro', e.target.value)}
              error={erros.logradouro}
              placeholder="Rua, Avenida..."
            />
          </div>
          <Input
            label="Número"
            name="numero"
            value={form.numero}
            onChange={(e) => set('numero', e.target.value)}
            placeholder="nº"
          />
        </div>

        <div className="sm:col-span-2">
          <Input
            label="Complemento"
            name="complemento"
            value={form.complemento}
            onChange={(e) => set('complemento', e.target.value)}
            placeholder="Apartamento, bloco, sala... (opcional)"
          />
        </div>

        <Input
          label="Bairro"
          name="bairro"
          value={form.bairro}
          onChange={(e) => set('bairro', e.target.value)}
          error={erros.bairro}
        />

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Input
              label="Cidade"
              name="cidade"
              value={form.cidade}
              onChange={(e) => set('cidade', e.target.value)}
              error={erros.cidade}
            />
          </div>
          <Select
            label="UF"
            name="uf"
            value={form.uf}
            onChange={(e) => set('uf', e.target.value)}
            error={erros.uf}
            options={UF_OPTIONS}
            placeholder="—"
          />
        </div>

        <Input
          label="E-mail"
          name="email"
          type="email"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          error={erros.email}
          placeholder="contato@exemplo.com.br"
        />

        <Input
          label="Celular"
          name="celular"
          value={mascaraCelular(form.celular)}
          onChange={(e) => set('celular', e.target.value)}
          error={erros.celular}
          placeholder="(00) 00000-0000"
          inputMode="numeric"
        />
      </div>

      {/* Credenciais de acesso (o e-mail acima é o login) */}
      <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-4 dark:border-ink-800 dark:bg-ink-800/30">
        <p className="mb-3 text-sm font-medium text-ink-700 dark:text-ink-200">
          Credenciais de acesso
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <PasswordInput
              label="Senha"
              name="senha"
              autoComplete="new-password"
              value={form.senha}
              onChange={(e) => set('senha', e.target.value)}
              error={erros.senha}
            />
            <PasswordStrength senha={form.senha} />
          </div>
          <PasswordInput
            label="Confirmar senha"
            name="confirmarSenha"
            autoComplete="new-password"
            value={form.confirmarSenha}
            onChange={(e) => set('confirmarSenha', e.target.value)}
            error={erros.confirmarSenha}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={salvando}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvando}>
          {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
          {salvando ? 'Salvando...' : 'Salvar Cadastro'}
        </Button>
      </div>
    </form>
  );
}
