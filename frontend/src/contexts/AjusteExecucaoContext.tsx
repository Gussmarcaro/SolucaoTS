import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { listarAjustes } from '@/services/ajustes.service';
import type { Ajuste } from '@/types/ajuste';

/**
 * O ajuste em que a Execução está acontecendo.
 *
 * **Por que a Execução passou a ter dono.** Receita, despesa e pagamento
 * nasciam soltos e só ganhavam parceria quando alguma prestação os apropriava.
 * Isso permitia a despesa de um ajuste entrar na prestação de outro — e o erro
 * não se vê olhando: os totais fecham. Escolher o ajuste **antes** de lançar
 * troca uma conferência que ninguém faz por uma decisão que o sistema registra.
 *
 * O ajuste fica no `localStorage`, pelo mesmo motivo que o órgão do suporte
 * fica na barra: quem lança dezenas de notas não pode reescolher a cada tela, e
 * lançamento no ajuste errado é indistinguível de lançamento certo até alguém
 * conferir. Por isso ele também fica **sempre à vista**, no cabeçalho.
 *
 * A chave inclui o órgão: o suporte troca de cliente, e o ajuste do anterior
 * não existe no novo — sem isso a tela abriria apontando para um id órfão.
 */
interface Contexto {
  ajusteId: string | null;
  ajuste: Ajuste | null;
  ajustes: Ajuste[];
  carregando: boolean;
  escolher: (id: string | null) => void;
}

const AjusteExecucaoContext = createContext<Contexto | null>(null);

const chave = (clienteId?: string | null) => `@SolucaoTS:execucao:ajuste:${clienteId ?? '-'}`;

export function AjusteExecucaoProvider({
  clienteId,
  children,
}: {
  clienteId?: string | null;
  children: ReactNode;
}) {
  const [ajusteId, setAjusteId] = useState<string | null>(null);
  const [ajustes, setAjustes] = useState<Ajuste[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    // Só os ajustes do órgão logado — a extension de tenant já recorta, e a
    // lista é curta o bastante para caber numa página só.
    listarAjustes({ page: 1, pageSize: 500 })
      .then((r) => {
        if (!vivo) return;
        setAjustes(r.data);
        /*
         * A escolha guardada só vale se o ajuste ainda existe.
         *
         * Ajuste excluído, ou troca de órgão pelo suporte, deixaria um id
         * órfão — e a Execução abriria filtrando por algo que não existe,
         * mostrando tudo vazio sem explicar por quê.
         */
        let guardado: string | null = null;
        try {
          guardado = localStorage.getItem(chave(clienteId));
        } catch {
          /* aba anônima: segue sem memória */
        }
        setAjusteId(guardado && r.data.some((a) => a.id === guardado) ? guardado : null);
      })
      .catch(() => vivo && setAjustes([]))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [clienteId]);

  const valor = useMemo<Contexto>(
    () => ({
      ajusteId,
      ajuste: ajustes.find((a) => a.id === ajusteId) ?? null,
      ajustes,
      carregando,
      escolher: (id) => {
        setAjusteId(id);
        try {
          if (id) localStorage.setItem(chave(clienteId), id);
          else localStorage.removeItem(chave(clienteId));
        } catch {
          /* sem armazenamento: vale só nesta sessão */
        }
      },
    }),
    [ajusteId, ajustes, carregando, clienteId],
  );

  return <AjusteExecucaoContext.Provider value={valor}>{children}</AjusteExecucaoContext.Provider>;
}

export function useAjusteExecucao(): Contexto {
  const ctx = useContext(AjusteExecucaoContext);
  if (!ctx)
    throw new Error('useAjusteExecucao precisa estar dentro de <AjusteExecucaoProvider>.');
  return ctx;
}
