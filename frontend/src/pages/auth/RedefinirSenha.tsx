import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, KeyRound, Loader2 } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PasswordStrength } from '@/components/ui/PasswordStrength';
import { Button } from '@/components/ui/Button';
import { redefinirSenha } from '@/services/auth.service';
import { extrairMensagemErro } from '@/services/http';
import { isSenhaForte } from '@/lib/validators';

export function RedefinirSenha() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();

  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erros, setErros] = useState<{ senha?: string; confirmar?: string }>({});
  const [alerta, setAlerta] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const tokenAusente = !token;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAlerta(null);
    const novos: typeof erros = {};
    if (!isSenhaForte(senha)) novos.senha = 'A senha não atende aos requisitos.';
    if (senha !== confirmar) novos.confirmar = 'As senhas não conferem.';
    setErros(novos);
    if (Object.keys(novos).length) return;

    setCarregando(true);
    try {
      await redefinirSenha({ token, senha, confirmarSenha: confirmar });
      setSucesso(true);
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (error) {
      setAlerta(extrairMensagemErro(error, 'Não foi possível redefinir a senha.'));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <AuthLayout
      title="Redefinir senha"
      subtitle={sucesso ? undefined : 'Crie uma nova senha para sua conta'}
      footer={
        <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
          Voltar ao login
        </Link>
      }
    >
      {sucesso ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 dark:bg-emerald-500/15">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <p className="text-sm text-ink-600 dark:text-ink-300">
            Senha redefinida com sucesso! Redirecionando para o login...
          </p>
        </div>
      ) : tokenAusente ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Link inválido: token de redefinição ausente. Solicite um novo e-mail de recuperação.</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {alerta && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{alerta}</span>
            </div>
          )}

          <div>
            <PasswordInput
              label="Nova senha"
              name="senha"
              autoComplete="new-password"
              value={senha}
              onChange={(e) => {
                setSenha(e.target.value);
                setErros((p) => ({ ...p, senha: undefined }));
              }}
              error={erros.senha}
            />
            <PasswordStrength senha={senha} />
          </div>

          <PasswordInput
            label="Confirmar nova senha"
            name="confirmar"
            autoComplete="new-password"
            value={confirmar}
            onChange={(e) => {
              setConfirmar(e.target.value);
              setErros((p) => ({ ...p, confirmar: undefined }));
            }}
            error={erros.confirmar}
          />

          <Button type="submit" size="lg" className="w-full" disabled={carregando}>
            {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            {carregando ? 'Salvando...' : 'Redefinir senha'}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
