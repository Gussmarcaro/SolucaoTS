import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, LogIn } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { login as loginRequest } from '@/services/auth.service';
import { extrairMensagemErro } from '@/services/http';
import { isEmailValido } from '@/lib/validators';

export function Login() {
  const { entrar } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destino = (location.state as { from?: string } | null)?.from ?? '/';

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [lembrar, setLembrar] = useState(false);
  const [erros, setErros] = useState<{ email?: string; senha?: string }>({});
  const [alerta, setAlerta] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAlerta(null);
    const novos: typeof erros = {};
    if (!isEmailValido(email)) novos.email = 'Informe um e-mail válido.';
    if (!senha) novos.senha = 'Informe a senha.';
    setErros(novos);
    if (Object.keys(novos).length) return;

    setCarregando(true);
    try {
      const { token, usuario } = await loginRequest({ email: email.trim(), senha, lembrar });
      entrar(token, usuario, lembrar);
      navigate(destino, { replace: true });
    } catch (error) {
      setAlerta(extrairMensagemErro(error, 'E-mail ou senha inválidos.'));
    } finally {
      setCarregando(false);
    }
  }

  /** Sessão local para explorar a UI sem backend (somente em desenvolvimento). */
  function entrarModoDemo() {
    entrar(
      'demo-token',
      { id: 'demo', nome: 'Usuário Demonstração', email: 'demo@solucaots.local' },
      false,
    );
    navigate(destino, { replace: true });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-ink-100 px-4 py-10 transition-colors duration-300 dark:bg-ink-950">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-ink-200/70 bg-white shadow-pop dark:border-ink-800/70 dark:bg-ink-900 md:grid-cols-2 md:min-h-[560px]">
        {/* Painel de boas-vindas (marca) */}
        <div className="relative hidden flex-col items-center justify-center gap-6 overflow-hidden bg-gradient-to-br from-brand-500 to-brand-700 p-10 text-center text-white md:flex">
          {/* Círculos decorativos */}
          <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-white/5" />

          <img
            src="/logo-branca-azulescuro.png"
            alt="Solução TS"
            className="relative h-28 w-auto object-contain"
          />
          <div className="relative">
            <h2 className="text-2xl font-bold tracking-tight">Que bom te ver!</h2>
            <p className="mx-auto mt-2 max-w-xs text-sm text-white/85">
              Gestão da prestação de contas ao Terceiro Setor. Acesse com sua conta para continuar.
            </p>
          </div>
          <Link
            to="/esqueci-senha"
            className="focus-ring relative rounded-full border border-white/70 px-8 py-2.5 text-sm font-semibold uppercase tracking-wide transition-colors hover:bg-white hover:text-brand-600"
          >
            Recuperar senha
          </Link>
        </div>

        {/* Formulário de login */}
        <div className="flex flex-col justify-center p-8 sm:p-10">
          {/* Logo no topo (mobile) */}
          <div className="mb-6 flex justify-center md:hidden">
            <img src="/logo-vertical.png" alt="Solução TS" className="h-20 w-auto object-contain dark:hidden" />
            <img
              src="/logo-vertical-dark.png"
              alt="Solução TS"
              className="hidden h-20 w-auto object-contain dark:block"
            />
          </div>

          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-brand-600 dark:text-brand-400">
              Entrar
            </h1>
            <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
              Use seu e-mail corporativo para acessar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {alerta && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{alerta}</span>
              </div>
            )}

            <Input
              label="E-mail"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErros((p) => ({ ...p, email: undefined }));
              }}
              error={erros.email}
              placeholder="voce@exemplo.com.br"
            />

            <PasswordInput
              label="Senha"
              name="senha"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => {
                setSenha(e.target.value);
                setErros((p) => ({ ...p, senha: undefined }));
              }}
              error={erros.senha}
              placeholder="Sua senha"
            />

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-600 dark:text-ink-300">
                <input
                  type="checkbox"
                  checked={lembrar}
                  onChange={(e) => setLembrar(e.target.checked)}
                  className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                />
                Lembrar de mim
              </label>
              <Link
                to="/esqueci-senha"
                className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
              >
                Esqueceu a senha?
              </Link>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={carregando}>
              {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              {carregando ? 'Entrando...' : 'Entrar'}
            </Button>

            {import.meta.env.DEV && (
              <>
                <div className="relative py-1 text-center">
                  <span className="relative bg-white px-2 text-xs text-ink-400 dark:bg-ink-900">
                    ou, durante o desenvolvimento
                  </span>
                  <div className="absolute inset-x-0 top-1/2 -z-0 h-px bg-ink-200 dark:bg-ink-800" />
                </div>
                <Button type="button" variant="secondary" size="lg" className="w-full" onClick={entrarModoDemo}>
                  Entrar em modo demonstração
                </Button>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
