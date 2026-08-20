import { createContext, useContext } from 'react';
import { cn } from '@/lib/cn';
import { usePermissoes } from '@/contexts/PermissoesContext';
import type { NivelPermissao } from '@/types/permissao';

/**
 * Recurso da grade em volta, para os botões não precisarem repeti-lo.
 *
 * Sem o contexto, cada `IconBtn` receberia o mesmo id — quatro vezes por
 * grade, doze grades — e bastaria um errado para a permissão ser conferida
 * contra a tela vizinha, sem nada quebrar.
 */
const RecursoContext = createContext<string | null>(null);

/**
 * Célula de ações de uma grade.
 *
 * Envolve os botões e declara a qual recurso a linha pertence. Botão que exige
 * faixa acima da do usuário **some** — desabilitar deixaria na tela um controle
 * que nunca vai funcionar, e a pessoa clicaria de novo achando que travou.
 *
 * Esconder é conveniência de interface: quem barra de fato é o gate do
 * servidor, que responde 403 mesmo se a tela mostrar o botão.
 */
export function AcoesGrade({
  recurso,
  children,
}: {
  recurso: string;
  children: React.ReactNode;
}) {
  return (
    <RecursoContext.Provider value={recurso}>
      <div className="flex items-center justify-center gap-1">{children}</div>
    </RecursoContext.Provider>
  );
}

interface IconBtnProps {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
  /**
   * Faixa mínima para o botão aparecer. Ausente = sempre visível — é o caso de
   * visualizar e de abrir o dossiê, que já estão cobertos por ver a grade.
   */
  exige?: Extract<NivelPermissao, 'EDICAO' | 'TOTAL'>;
  /**
   * Mostra o botão **mesmo sem** a faixa exigida.
   *
   * Para a regra fina de propriedade, que a matriz não enxerga: ela concede por
   * recurso, e há ações que dependem do registro concreto — o criador excluir o
   * próprio compromisso, por exemplo. Continua sendo conveniência de interface;
   * quem barra é o servidor, que confere o dono do registro.
   */
  mesmoSem?: boolean;
}

export function IconBtn({ children, title, onClick, danger, exige, mesmoSem }: IconBtnProps) {
  const recurso = useContext(RecursoContext);
  const { pode } = usePermissoes();

  if (exige && recurso && !mesmoSem && !pode(recurso, exige)) return null;

  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'focus-ring rounded-lg p-1.5 transition-colors',
        danger
          ? 'text-ink-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10'
          : 'text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-100',
      )}
    >
      {children}
    </button>
  );
}
