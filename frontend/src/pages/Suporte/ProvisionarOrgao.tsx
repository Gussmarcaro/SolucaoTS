import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Building2, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { useAuth } from '@/contexts/AuthContext';
import { provisionarOrgao, type ProvisionarResultado } from '@/services/suporte.service';
import { extrairMensagemErro } from '@/services/http';
import { apenasDigitos, mascaraCpfCnpj } from '@/lib/masks';
import { isCnpjValido, isCpfValido } from '@/lib/validators';
import { capitalizarNome } from '@/lib/nomeProprio';
import { PERIODICIDADE_LABEL, TIPO_ORGAO_LABEL } from '@/types/orgao';

type Campos = {
  nome: string;
  cnpj: string;
  codigoMunicipio: string;
  codigoEntidade: string;
  tipoOrgao: string;
  periodicidade: string;
  adminNome: string;
  adminEmail: string;
  adminDocumento: string;
  adminSenha: string;
};

const VAZIO: Campos = {
  nome: '',
  cnpj: '',
  codigoMunicipio: '',
  codigoEntidade: '',
  tipoOrgao: 'PREFEITURA_MUNICIPAL',
  periodicidade: 'QUADRIMESTRAL',
  adminNome: '',
  adminEmail: '',
  adminDocumento: '',
  adminSenha: '',
};

/**
 * Provisionamento de um cliente novo — órgão e o primeiro administrador dele.
 *
 * Existe porque o carimbo automático de órgão, que resolve o dia a dia, não
 * resolve o começo: um usuário criado por alguém da Prefeitura A nasceria na
 * Prefeitura A. O primeiro usuário de um cliente precisa nascer fora de
 * qualquer órgão, e essa é a única operação do sistema que faz isso.
 *
 * Órgão, grupo Administrador e usuário são criados **numa transação**. Meio
 * provisionamento é pior que nenhum: órgão sem administrador não tem como ser
 * acessado, e usuário sem grupo cai na regra de "grupo nunca configurado", que
 * libera tudo.
 */
export function ProvisionarOrgao() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<Campos>(VAZIO);
  const [erros, setErros] = useState<Partial<Record<keyof Campos, string>>>({});
  const [alerta, setAlerta] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [pronto, setPronto] = useState<ProvisionarResultado | null>(null);

  const set = (campo: keyof Campos, valor: string) => {
    setForm((p) => ({ ...p, [campo]: valor }));
    setErros((p) => ({ ...p, [campo]: undefined }));
    setAlerta(null);
  };

  // A tela some para quem não é do suporte — o servidor responde 404 de
  // qualquer forma, mas não faz sentido oferecer o caminho.
  if (!usuario?.suporte) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-ink-200/70 bg-white p-8 text-center shadow-card dark:border-ink-800/70 dark:bg-ink-900">
        <ShieldAlert className="mx-auto h-8 w-8 text-ink-300" />
        <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">
          Esta área é da equipe do fornecedor.
        </p>
      </div>
    );
  }

  function validar(): boolean {
    const e: Partial<Record<keyof Campos, string>> = {};
    if (form.nome.trim().length < 3) e.nome = 'Informe o nome do órgão.';
    if (!isCnpjValido(form.cnpj)) e.cnpj = 'CNPJ inválido.';
    if (!Number(form.codigoMunicipio)) e.codigoMunicipio = 'Informe o código do município.';
    if (!Number(form.codigoEntidade)) e.codigoEntidade = 'Informe o código da entidade.';
    if (form.adminNome.trim().length < 3) e.adminNome = 'Informe o nome do administrador.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.adminEmail.trim())) e.adminEmail = 'E-mail inválido.';
    if (!isCpfValido(form.adminDocumento)) e.adminDocumento = 'CPF inválido.';
    if (form.adminSenha.length < 8) e.adminSenha = 'Mínimo de 8 caracteres.';
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    setAlerta(null);
    if (!validar()) return;
    setSalvando(true);
    try {
      setPronto(
        await provisionarOrgao({
          ...form,
          cnpj: apenasDigitos(form.cnpj),
          adminDocumento: apenasDigitos(form.adminDocumento),
          adminEmail: form.adminEmail.trim().toLowerCase(),
        }),
      );
    } catch (error) {
      setAlerta(extrairMensagemErro(error, 'Não foi possível provisionar o órgão.'));
    } finally {
      setSalvando(false);
    }
  }

  if (pronto) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-card dark:border-emerald-500/30 dark:bg-ink-900">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
          <h2 className="mt-3 text-lg font-semibold text-ink-900 dark:text-ink-50">
            {pronto.clienteNome} provisionado
          </h2>
          <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">
            Foram criados o órgão, o grupo <strong>Administrador</strong> e o primeiro usuário.
          </p>
          <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-left text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            O administrador entra com o e-mail e a senha informados. O cadastro dele fica com
            endereço e celular em branco — dados que o suporte não tem por que saber; ele completa
            no primeiro acesso.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="secondary" onClick={() => { setPronto(null); setForm(VAZIO); }}>
              Provisionar outro
            </Button>
            <Button onClick={() => navigate('/')}>Concluir</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Provisionar órgão"
        subtitle="Cria o órgão e o primeiro administrador dele — a única operação que acontece fora de um órgão."
        actions={
          <Button variant="secondary" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        }
      />

      <form
        onSubmit={enviar}
        className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-ink-200/70 bg-white p-6 shadow-card dark:border-ink-800/70 dark:bg-ink-900"
      >
        {alerta && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{alerta}</span>
          </div>
        )}

        <section>
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-700 dark:text-ink-200">
            <Building2 className="h-4 w-4 text-brand-500" />
            Órgão
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                label="Nome do órgão *"
                name="nome"
                value={form.nome}
                onChange={(e) => set('nome', e.target.value.toUpperCase())}
                error={erros.nome}
                placeholder="PREFEITURA MUNICIPAL DE..."
              />
            </div>
            <Input
              label="CNPJ *"
              name="cnpj"
              value={mascaraCpfCnpj(form.cnpj)}
              onChange={(e) => set('cnpj', e.target.value)}
              error={erros.cnpj}
              placeholder="00.000.000/0000-00"
              inputMode="numeric"
            />
            <Select
              label="Tipo de órgão *"
              name="tipoOrgao"
              value={form.tipoOrgao}
              onChange={(e) => set('tipoOrgao', e.target.value)}
              options={Object.entries(TIPO_ORGAO_LABEL).map(([value, label]) => ({ value, label }))}
            />
            <Input
              label="Código do município (TCESP) *"
              name="codigoMunicipio"
              value={apenasDigitos(form.codigoMunicipio).slice(0, 4)}
              onChange={(e) => set('codigoMunicipio', e.target.value)}
              error={erros.codigoMunicipio}
              inputMode="numeric"
            />
            <Input
              label="Código da entidade (TCESP) *"
              name="codigoEntidade"
              value={apenasDigitos(form.codigoEntidade).slice(0, 5)}
              onChange={(e) => set('codigoEntidade', e.target.value)}
              error={erros.codigoEntidade}
              inputMode="numeric"
            />
            <div className="sm:col-span-2">
              <Select
                label="Periodicidade da Declaração Negativa *"
                name="periodicidade"
                value={form.periodicidade}
                onChange={(e) => set('periodicidade', e.target.value)}
                options={Object.entries(PERIODICIDADE_LABEL).map(([value, label]) => ({ value, label }))}
              />
              <p className="mt-1 text-xs text-ink-400">
                Quadrimestral: prefeituras, autarquias e fundações típicas. Anual: câmaras e demais.
              </p>
            </div>
          </div>
        </section>

        <section className="border-t border-ink-100 pt-5 dark:border-ink-800">
          <p className="mb-1 text-sm font-semibold text-ink-700 dark:text-ink-200">
            Primeiro administrador
          </p>
          <p className="mb-3 text-xs text-ink-400">
            Nasce no grupo Administrador do órgão novo. É por ele que o cliente entra pela primeira
            vez e cadastra os demais usuários.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                label="Nome completo *"
                name="adminNome"
                value={form.adminNome}
                onChange={(e) => set('adminNome', capitalizarNome(e.target.value))}
                error={erros.adminNome}
              />
            </div>
            <Input
              label="E-mail (login) *"
              name="adminEmail"
              type="email"
              value={form.adminEmail}
              onChange={(e) => set('adminEmail', e.target.value)}
              error={erros.adminEmail}
            />
            <Input
              label="CPF *"
              name="adminDocumento"
              value={mascaraCpfCnpj(form.adminDocumento)}
              onChange={(e) => set('adminDocumento', e.target.value)}
              error={erros.adminDocumento}
              placeholder="000.000.000-00"
              inputMode="numeric"
            />
            <div className="sm:col-span-2">
              <PasswordInput
                label="Senha inicial *"
                name="adminSenha"
                value={form.adminSenha}
                onChange={(e) => set('adminSenha', e.target.value)}
                error={erros.adminSenha}
              />
              <p className="mt-1 text-xs text-ink-400">
                Combine com o cliente e oriente a troca no primeiro acesso.
              </p>
            </div>
          </div>
        </section>

        <div className="flex items-center justify-end gap-2 border-t border-ink-100 pt-4 dark:border-ink-800">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando}>
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
            {salvando ? 'Provisionando...' : 'Provisionar órgão'}
          </Button>
        </div>
      </form>
    </>
  );
}
