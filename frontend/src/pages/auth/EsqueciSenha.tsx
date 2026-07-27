import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, Send } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { solicitarRecuperacao } from '@/services/auth.service';
import { extrairMensagemErro } from '@/services/http';
import { isEmailValido } from '@/lib/validators';

export function EsqueciSenha() {
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!isEmailValido(email)) {
      setErro('Informe um e-mail válido.');
      return;
    }
    setCarregando(true);
    try {
      await solicitarRecuperacao(email.trim());
      setEnviado(true);
    } catch (error) {
      setErro(extrairMensagemErro(error, 'Não foi possível processar a solicitação.'));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <AuthLayout
      title="Recuperar senha"
      subtitle={enviado ? undefined : 'Informe seu e-mail para receber as instruções'}
      footer={
        <Link to="/login" className="inline-flex items-center gap-1 font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
          <ArrowLeft className="h-4 w-4" />
          Voltar ao login
        </Link>
      }
    >
      {enviado ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 dark:bg-emerald-500/15">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <p className="text-sm text-ink-600 dark:text-ink-300">
            Se o e-mail informado estiver em nossa base, você receberá as instruções para redefinição
            de senha em breve.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="E-mail cadastrado"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErro(null);
            }}
            error={erro ?? undefined}
            placeholder="voce@exemplo.com.br"
          />
          <Button type="submit" size="lg" className="w-full" disabled={carregando}>
            {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {carregando ? 'Enviando...' : 'Enviar instruções'}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
