import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Combobox, type OpcaoCombo } from '@/components/ui/Combobox';
import { Button } from '@/components/ui/Button';
import { FormularioNovo } from '@/components/ui/LabelCampo';
import { listarGruposAtivos } from '@/services/grupos.service';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PasswordStrength } from '@/components/ui/PasswordStrength';
import { UF_OPTIONS } from '@/lib/ufs';
import { apenasDigitos, mascaraCelular, mascaraCep, mascaraCpf } from '@/lib/masks';
import { isCpfValido, isEmailValido, isSenhaForte } from '@/lib/validators';
import { capitalizarNome } from '@/lib/nomeProprio';
import { consultarCep } from '@/services/viacep.service';
import { atualizarUsuario, criarUsuario } from '@/services/usuarios.service';
import { extrairCodigoErro, extrairMensagemErro } from '@/services/http';
import type { AtualizarUsuarioPayload, CriarUsuarioPayload, Usuario } from '@/types/usuario';

interface UsuarioFormProps {
  usuario?: Usuario | null;
  onSuccess: () => void;
  onCancel: () => void;
}

type Campos = {
  nome: string;
  documento: string;
  grupoUsuarioId: string;
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

function estadoInicial(u?: Usuario | null): Campos {
  return {
    nome: u?.nome ?? '',
    documento: u?.documento ?? '',
    grupoUsuarioId: u?.grupoUsuarioId ?? '',
    cep: u?.cep ?? '',
    logradouro: u?.logradouro ?? '',
    numero: u?.numero ?? '',
    complemento: u?.complemento ?? '',
    bairro: u?.bairro ?? '',
    cidade: u?.cidade ?? '',
    uf: u?.uf ?? '',
    email: u?.email ?? '',
    celular: u?.celular ?? '',
    senha: '',
    confirmarSenha: '',
  };
}

export function UsuarioForm({ usuario, onSuccess, onCancel }: UsuarioFormProps) {
  const editando = !!usuario;
  const [form, setForm] = useState<Campos>(() => estadoInicial(usuario));
  const [erros, setErros] = useState<Partial<Record<keyof Campos, string>>>({});
  const [alerta, setAlerta] = useState<string | null>(null);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [grupos, setGrupos] = useState<OpcaoCombo[]>([]);

  useEffect(() => {
    let vivo = true;
    listarGruposAtivos()
      .then((ativos) => {
        if (!vivo) return;
        const opts: OpcaoCombo[] = ativos.map((g) => ({ value: g.id, label: g.nome }));
        // mantém o grupo atual do usuário na lista mesmo se estiver inativo
        if (usuario?.grupoUsuarioId && !opts.some((o) => o.value === usuario.grupoUsuarioId)) {
          opts.push({ value: usuario.grupoUsuarioId, label: usuario.grupoNome ?? 'Grupo atual', sub: '(inativo)' });
        }
        setGrupos(opts);
      })
      .catch(() => vivo && setGrupos([]));
    return () => {
      vivo = false;
    };
  }, [usuario]);

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
    if (form.nome.trim().length < 3) novos.nome = 'Informe o nome completo.';
    if (!isCpfValido(form.documento)) novos.documento = 'CPF inválido.';
    if (apenasDigitos(form.cep).length !== 8) novos.cep = 'CEP inválido.';
    if (!form.logradouro.trim()) novos.logradouro = 'Informe o endereço.';
    if (!form.bairro.trim()) novos.bairro = 'Informe o bairro.';
    if (!form.cidade.trim()) novos.cidade = 'Informe a cidade.';
    if (!form.uf) novos.uf = 'Selecione a UF.';
    if (!isEmailValido(form.email)) novos.email = 'E-mail inválido.';
    if (apenasDigitos(form.celular).length < 10) novos.celular = 'Celular inválido.';
    // Senha: obrigatória no cadastro; na edição só valida se preenchida.
    if (!editando || form.senha || form.confirmarSenha) {
      if (!isSenhaForte(form.senha)) novos.senha = 'A senha não atende aos requisitos.';
      if (form.senha !== form.confirmarSenha) novos.confirmarSenha = 'As senhas não conferem.';
    }
    setErros(novos);
    return Object.keys(novos).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAlerta(null);
    if (!validar()) return;

    const base = {
      nome: form.nome.trim(),
      documento: apenasDigitos(form.documento),
      grupoUsuarioId: form.grupoUsuarioId || null,
      cep: apenasDigitos(form.cep),
      logradouro: form.logradouro.trim(),
      numero: form.numero.trim() || null,
      complemento: form.complemento.trim() || null,
      bairro: form.bairro.trim(),
      cidade: form.cidade.trim(),
      uf: form.uf,
      email: form.email.trim().toLowerCase(),
      celular: apenasDigitos(form.celular),
    };

    setSalvando(true);
    try {
      if (editando) {
        const payload: AtualizarUsuarioPayload = { ...base };
        if (form.senha) {
          payload.senha = form.senha;
          payload.confirmarSenha = form.confirmarSenha;
        }
        await atualizarUsuario(usuario!.id, payload);
      } else {
        const payload: CriarUsuarioPayload = {
          ...base,
          senha: form.senha,
          confirmarSenha: form.confirmarSenha,
        };
        await criarUsuario(payload);
      }
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
    <FormularioNovo novo={!editando}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {alerta && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{alerta}</span>
          </div>
        )}

        {/* Grade de 12 colunas: cada campo ocupa a largura que precisa, em vez
            de esticar até o fim da linha. Deixa o formulário em 5 faixas. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
          <div className="sm:col-span-7">
            <Input
              label="Nome Completo *"
              name="nome"
              value={form.nome}
              onChange={(e) => set('nome', capitalizarNome(e.target.value))}
              error={erros.nome}
              placeholder="Ex.: Maria Silva de Souza"
            />
          </div>
          <div className="sm:col-span-5">
            <Input
              label="CPF *"
              name="documento"
              value={mascaraCpf(form.documento)}
              onChange={(e) => set('documento', e.target.value)}
              error={erros.documento}
              placeholder="000.000.000-00"
              inputMode="numeric"
            />
          </div>

          <div className="sm:col-span-3">
            <Input
              label="CEP *"
              name="cep"
              value={mascaraCep(form.cep)}
              onChange={(e) => set('cep', e.target.value)}
              onBlur={handleCepBlur}
              error={erros.cep}
              placeholder="00000-000"
              inputMode="numeric"
              rightSlot={
                buscandoCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />
              }
            />
          </div>
          <div className="sm:col-span-6">
            <Input
              label="Endereço (Logradouro) *"
              name="logradouro"
              value={form.logradouro}
              onChange={(e) => set('logradouro', e.target.value)}
              error={erros.logradouro}
              placeholder="Rua, Avenida..."
            />
          </div>
          <div className="sm:col-span-3">
            <Input
              label="Número"
              name="numero"
              value={form.numero}
              onChange={(e) => set('numero', e.target.value)}
              placeholder="nº"
            />
          </div>

          <div className="sm:col-span-6">
            <Input
              label="Complemento"
              name="complemento"
              value={form.complemento}
              onChange={(e) => set('complemento', e.target.value)}
              placeholder="Apartamento, bloco, sala... (opcional)"
            />
          </div>
          <div className="sm:col-span-6">
            <Input
              label="Bairro *"
              name="bairro"
              value={form.bairro}
              onChange={(e) => set('bairro', e.target.value)}
              error={erros.bairro}
            />
          </div>

          <div className="sm:col-span-5">
            <Input
              label="Cidade *"
              name="cidade"
              value={form.cidade}
              onChange={(e) => set('cidade', e.target.value)}
              error={erros.cidade}
            />
          </div>
          <div className="sm:col-span-2">
            <Select
              label="UF *"
              name="uf"
              value={form.uf}
              onChange={(e) => set('uf', e.target.value)}
              error={erros.uf}
              options={UF_OPTIONS}
              placeholder="—"
            />
          </div>
          <div className="sm:col-span-5">
            <Input
              label="E-mail *"
              name="email"
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              error={erros.email}
              placeholder="contato@exemplo.com.br"
            />
          </div>

          <div className="sm:col-span-4">
            <Input
              label="Celular *"
              name="celular"
              value={mascaraCelular(form.celular)}
              onChange={(e) => set('celular', e.target.value)}
              error={erros.celular}
              placeholder="(00) 00000-0000"
              inputMode="numeric"
            />
          </div>
          <div className="sm:col-span-8">
            <Combobox
              label="Grupo de Usuários"
              name="grupoUsuarioId"
              value={form.grupoUsuarioId}
              onChange={(v) => set('grupoUsuarioId', v)}
              options={grupos}
              placeholder="Selecione um grupo (opcional)"
              hint="Define o perfil de acesso."
            />
          </div>
          {/*
            Órgão: mostrado, nunca escolhido. O usuário novo herda o órgão de
            quem o está cadastrando — e "mover usuário para outro órgão" é
            justamente o que o administrador de um órgão não pode fazer.
          */}
          <div className="sm:col-span-12">
            <Input
              label="Órgão"
              anotacao="(Automático)"
              name="orgao"
              value={usuario?.orgaoNome ?? (editando ? 'Sem órgão' : 'O seu órgão')}
              readOnly
              hint={
                editando
                  ? 'Definido no cadastro do usuário. Não é alterável por aqui.'
                  : 'O usuário nasce no mesmo órgão de quem o cadastra.'
              }
            />
          </div>
        </div>

        {/* Credenciais de acesso (o e-mail acima é o login) */}
        <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-3 dark:border-ink-800 dark:bg-ink-800/30">
          <p className="mb-2 text-sm font-medium text-ink-700 dark:text-ink-200">
            Credenciais de acesso
            {editando && (
              <span className="ml-1 font-normal text-ink-400">
                — deixe em branco para manter a senha atual
              </span>
            )}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <PasswordInput
                label={editando ? 'Senha' : 'Senha *'}
                name="senha"
                autoComplete="new-password"
                value={form.senha}
                onChange={(e) => set('senha', e.target.value)}
                error={erros.senha}
              />
              <PasswordStrength senha={form.senha} />
            </div>
            <PasswordInput
              label={editando ? 'Confirmar senha' : 'Confirmar senha *'}
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
            {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Salvar Cadastro'}
          </Button>
        </div>
      </form>
    </FormularioNovo>
  );
}
