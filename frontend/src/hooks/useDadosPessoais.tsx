import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { http } from '@/services/http';

/**
 * Controla a exibição de dados pessoais numa tela.
 *
 * O padrão é **mascarado**; revelar é uma ação consciente de quem precisa do
 * dado, e essa ação vira registro na trilha (LGPD art. 37 — registro das
 * operações de tratamento). Voltar a esconder não gera registro: o que a lei
 * pede é saber quem acessou, não quem deixou de acessar.
 *
 * O estado é por tela e por sessão: sair da tela volta a mascarar, sem
 * "lembrar" que a pessoa já tinha revelado antes.
 */
export function useDadosPessoais(entidade: string, tela: string) {
  const [revelado, setRevelado] = useState(false);

  async function alternar() {
    if (revelado) return setRevelado(false);
    setRevelado(true);
    try {
      await http.post('/lgpd/acesso-dados', { entidade, tela });
    } catch {
      // Falhar o registro não pode travar o trabalho — o mesmo critério da
      // trilha de alterações, que também não derruba a operação de negócio.
    }
  }

  return { revelado, alternar };
}

/** Botão padrão de revelar/ocultar, para as telas ficarem iguais entre si. */
export function BotaoDadosPessoais({
  revelado,
  onAlternar,
}: {
  revelado: boolean;
  onAlternar: () => void;
}) {
  const Icone = revelado ? EyeOff : Eye;
  return (
    <button
      type="button"
      onClick={onAlternar}
      title={
        revelado
          ? 'Ocultar dados pessoais'
          : 'Exibir dados pessoais — o acesso fica registrado na auditoria'
      }
      className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100"
    >
      <Icone className="h-4 w-4" />
      {revelado ? 'Ocultar dados pessoais' : 'Exibir dados pessoais'}
    </button>
  );
}
