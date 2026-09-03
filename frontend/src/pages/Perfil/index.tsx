import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Search, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PasswordStrength } from '@/components/ui/PasswordStrength';
import { useAuth } from '@/contexts/AuthContext';
import { UF_OPTIONS } from '@/lib/ufs';
import { apenasDigitos, mascaraCelular, mascaraCep, mascaraCpf } from '@/lib/masks';
import { isEmailValido, isSenhaForte } from '@/lib/validators';
import { capitalizarNome } from '@/lib/nomeProprio';
import { consultarCep } from '@/services/viacep.service';
import { atualizarMeuPerfil, meuPerfil } from '@/services/perfil.service';
import { extrairMensagemErro } from '@/services/http';
import type { Usuario } from '@/types/usuario';

type Campos = {
  nome: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  email: string;
  celular: string;
  senhaAtual: string;
  novaSenha: string;
  confirmarSenha: string;
};

const VAZIO: Campos = {
  nome: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  email: '',
  celular: '',
  senhaAtual: '',
  novaSenha: '',
  confirmarSenha: '',
};

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes[partes.length - 1]?.[0] ?? '')).toUpperCase() || 'US';
}

/**
 * Meu Perfil — o usuário editando o próprio cadastro.
 *
 * Fora da matriz de permissões de propósito: trocar a própria senha não pode
 * exigir `CONFIG_USUARIOS`, que é a permissão de administrar **os outros**. Por
 * isso a tela também não entra no menu — chega-se a ela pelo nome na barra
 * superior, que é onde se procura o próprio perfil.
 *
 * Três campos aparecem e não se editam, cada um por um motivo distinto:
 *
 * - **Grupo de acesso** — é o que decide o que a pessoa pode fazer. Editável
 *   aqui, qualquer usuário se promoveria a administrador. O servidor o preserva
 *   do registro; o campo existe na tela só para a pessoa saber em que grupo
 *   está quando algo lhe for negado.
 * - **Órgão** — num sistema multi-tenant, mudar de órgão é mudar de cliente.
 * - **CPF** — identifica a pessoa na trilha de auditoria; quem precisa corrigir
 *   passa pelo cadastro de usuários.
 */
export function Perfil() {
  const { usuario: sessao, atualizarSessao } = useAuth();

  const [registro, setRegistro] = useState<Usuario | null>(null);
  const [form, setForm] = useState<Campos>(VAZIO);
  const [erros, setErros] = useState<Partial<Record<keyof Campos, string>>>({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [alerta, setAlerta] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    meuPerfil()
      .then((u) => {
        if (!vivo) return;
        setRegistro(u);
        setForm({
          ...VAZIO,
          nome: u.nome,
          cep: u.cep,
          logradouro: u.logradouro,
          numero: u.numero ?? '',
          complemento: u.complemento ?? '',
          bairro: u.bairro,
          cidade: u.cidade,
          uf: u.uf,
          email: u.email,
          celular: u.celular,
        });
      })
      .catch((e) => vivo && setAlerta(extrairMensagemErro(e, 'Falha ao carregar o seu cadastro.')))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, []);

  const set = (campo: keyof Campos, valor: string) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setErros((prev) => ({ ...prev, [campo]: undefined }));
    setAlerta(null);
    setSucesso(null);
  };

  const trocaEmail = !!registro && form.email.trim().toLowerCase() !== registro.email;
  const trocaSenha = !!form.novaSenha || !!form.confirmarSenha;
  const exigeSenhaAtual = trocaEmail || trocaSenha;

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
      setErros((prev) => ({ ...prev, cep: undefined }));
    } catch {
      setErros((prev) => ({ ...prev, cep: 'Falha ao consultar o CEP.' }));
    } finally {
      setBuscandoCep(false);
    }
  }

  function validar(): boolean {
    const novos: Partial<Record<keyof Campos, string>> = {};
    if (form.nome.trim().length < 3) novos.nome = 'Informe o nome completo.';
    if (apenasDigitos(form.cep).length !== 8) novos.cep = 'CEP inválido.';
    if (!form.logradouro.trim()) novos.logradouro = 'Informe o endereço.';
    if (!form.bairro.trim()) novos.bairro = 'Informe o bairro.';
    if (!form.cidade.trim()) novos.cidade = 'Informe a cidade.';
    if (!form.uf) novos.uf = 'Selecione a UF.';
    if (!isEmailValido(form.email)) novos.email = 'E-mail inválido.';
    if (apenasDigitos(form.celular).length < 10) novos.celular = 'Celular inválido.';

    if (trocaSenha) {
      if (!isSenhaForte(form.novaSenha)) novos.novaSenha = 'A senha não atende aos requisitos.';
      if (form.novaSenha !== form.confirmarSenha) novos.confirmarSenha = 'As senhas não conferem.';
      if (form.novaSenha && form.novaSenha === form.senhaAtual)
        novos.novaSenha = 'A nova senha precisa ser diferente da atual.';
    }
    // A conferência de verdade é do servidor — aqui é só para o usuário não
    // enviar o formulário por um campo que já se sabe faltando.
    if (exigeSenhaAtual && !form.senhaAtual)
      novos.senhaAtual = trocaSenha
        ? 'Informe a senha atual para definir uma nova.'
        : 'Informe a senha atual para alterar o e-mail de acesso.';

    setErros(novos);
    return Object.keys(novos).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAlerta(null);
    setSucesso(null);
    if (!registro || !validar()) return;

    setSalvando(true);
    try {
      const atualizado = await atualizarMeuPerfil({
        nome: form.nome.trim(),
        documento: registro.documento,
        cep: apenasDigitos(form.cep),
        logradouro: form.logradouro.trim(),
        numero: form.numero.trim() || null,
        complemento: form.complemento.trim() || null,
        bairro: form.bairro.trim(),
        cidade: form.cidade.trim(),
        uf: form.uf,
        email: form.email.trim().toLowerCase(),
        celular: apenasDigitos(form.celular),
        ...(exigeSenhaAtual ? { senhaAtual: form.senhaAtual } : {}),
        ...(trocaSenha ? { novaSenha: form.novaSenha, confirmarSenha: form.confirmarSenha } : {}),
      });

      setRegistro(atualizado);
      // A barra superior mostra nome e e-mail: sem isto ela continuaria com os
      // antigos até o próximo login, e o usuário concluiria que não salvou.
      atualizarSessao({ nome: atualizado.nome, email: atualizado.email });
      setForm((prev) => ({ ...prev, senhaAtual: '', novaSenha: '', confirmarSenha: '' }));
      setSucesso(
        trocaSenha
          ? 'Perfil atualizado. A nova senha já vale para o próximo acesso.'
          : 'Perfil atualizado.',
      );
    } catch (error) {
      setAlerta(extrairMensagemErro(error, 'Não foi possível salvar o perfil.'));
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-ink-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando o seu cadastro...
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Meu Perfil"
        subtitle="Seus dados de cadastro e as credenciais de acesso ao sistema."
      />

      {alerta && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{alerta}</span>
        </div>
      )}
      {sucesso && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{sucesso}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identificação — e o que não se edita aqui */}
        <Card>
          <CardBody>
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-bold text-white">
                {iniciais(form.nome || sessao?.nome || '')}
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-ink-900 dark:text-ink-50">
                  {form.nome || sessao?.nome}
                </p>
                <p className="truncate text-[13px] text-ink-500 dark:text-ink-400">
                  {registro?.grupoNome ?? 'Sem grupo de acesso'}
                  {registro?.orgaoNome ? ` · ${registro.orgaoNome}` : ''}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="sm:col-span-4">
                <Input
                  label="CPF"
                  anotacao="(Não alterável)"
                  name="documento"
                  value={mascaraCpf(registro?.documento ?? '')}
                  readOnly
                  hint="Identifica você na trilha de auditoria."
                />
              </div>
              <div className="sm:col-span-4">
                <Input
                  label="Grupo de acesso"
                  anotacao="(Não alterável)"
                  name="grupo"
                  value={registro?.grupoNome ?? 'Sem grupo'}
                  readOnly
                  hint="Define o que você pode fazer. Só quem administra usuários altera."
                />
              </div>
              <div className="sm:col-span-4">
                <Input
                  label="Órgão"
                  anotacao="(Não alterável)"
                  name="orgao"
                  value={registro?.orgaoNome ?? 'Sem órgão'}
                  readOnly
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Dados pessoais */}
        <Card>
          <CardHeader>
            <CardTitle>Dados pessoais</CardTitle>
          </CardHeader>
          <CardBody className="pt-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="sm:col-span-7">
                <Input
                  label="Nome Completo *"
                  name="nome"
                  value={form.nome}
                  onChange={(e) => set('nome', capitalizarNome(e.target.value))}
                  error={erros.nome}
                />
              </div>
              <div className="sm:col-span-5">
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
                    buscandoCep ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )
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

              <div className="sm:col-span-10">
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
            </div>
          </CardBody>
        </Card>

        {/* Acesso */}
        <Card>
          <CardHeader>
            <CardTitle>Acesso ao sistema</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 pt-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="sm:col-span-6">
                <Input
                  label="E-mail *"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  error={erros.email}
                  hint="É com ele que você entra no sistema."
                />
              </div>
              <div className="sm:col-span-6">
                <PasswordInput
                  label={exigeSenhaAtual ? 'Senha atual *' : 'Senha atual'}
                  name="senhaAtual"
                  autoComplete="current-password"
                  value={form.senhaAtual}
                  onChange={(e) => set('senhaAtual', e.target.value)}
                  error={erros.senhaAtual}
                />
                {!erros.senhaAtual && (
                  <p className="mt-1 text-xs text-ink-400">
                    Exigida para trocar a senha ou o e-mail de acesso.
                  </p>
                )}
              </div>
              <div className="sm:col-span-6">
                <PasswordInput
                  label="Nova senha"
                  name="novaSenha"
                  autoComplete="new-password"
                  value={form.novaSenha}
                  onChange={(e) => set('novaSenha', e.target.value)}
                  error={erros.novaSenha}
                />
                {form.novaSenha && <PasswordStrength senha={form.novaSenha} />}
              </div>
              <div className="sm:col-span-6">
                <PasswordInput
                  label="Confirmar nova senha"
                  name="confirmarSenha"
                  autoComplete="new-password"
                  value={form.confirmarSenha}
                  onChange={(e) => set('confirmarSenha', e.target.value)}
                  error={erros.confirmarSenha}
                />
              </div>
            </div>

            <p className="flex items-start gap-2 text-xs text-ink-400">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Deixe a nova senha em branco para manter a atual. Trocar o e-mail troca também o seu
              login — o antigo deixa de valer no próximo acesso.
            </p>
          </CardBody>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button type="submit" disabled={salvando}>
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
            {salvando ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </form>
    </>
  );
}
