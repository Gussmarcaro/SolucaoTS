import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { permissoesApi } from '@/services/permissoes.service';
import type { AcessoDoRecurso, NivelPermissao } from '@/types/permissao';

const PESO: Record<NivelPermissao, number> = {
  SEM_ACESSO: 0,
  CONSULTA: 1,
  EDICAO: 2,
  TOTAL: 3,
};

interface Contexto {
  /** Faixa do usuário no recurso. */
  nivel: (recursoId: string) => NivelPermissao;
  /** Atende à faixa mínima? */
  pode: (recursoId: string, minimo: NivelPermissao) => boolean;
  /** Pode transmitir ao TCESP. */
  podeTransmitir: (recursoId: string) => boolean;
  carregando: boolean;
}

const PermissoesContext = createContext<Contexto | null>(null);

/**
 * Permissões do usuário logado, para a interface esconder o que não interessa.
 *
 * Esconder é conveniência: quem barra de fato é o servidor. Por isso, enquanto
 * a consulta não volta, a interface assume **acesso total** — o contrário faria
 * o menu piscar vazio a cada carregamento, e o usuário legítimo veria as telas
 * sumirem por um instante. Se ele clicar em algo que não pode, o gate responde.
 */
export function PermissoesProvider({ children }: { children: React.ReactNode }) {
  const [acessos, setAcessos] = useState<Map<string, AcessoDoRecurso> | null>(null);

  useEffect(() => {
    let vivo = true;
    permissoesApi
      .minhas()
      .then((r) => vivo && setAcessos(new Map(r.map((a) => [a.recursoId, a]))))
      // Falha na consulta não pode trancar a tela: o servidor continua
      // barrando o que precisa ser barrado.
      .catch(() => vivo && setAcessos(null));
    return () => {
      vivo = false;
    };
  }, []);

  const valor = useMemo<Contexto>(() => {
    const nivel = (recursoId: string): NivelPermissao =>
      acessos ? (acessos.get(recursoId)?.nivel ?? 'SEM_ACESSO') : 'TOTAL';

    return {
      nivel,
      pode: (recursoId, minimo) => PESO[nivel(recursoId)] >= PESO[minimo],
      podeTransmitir: (recursoId) => (acessos ? !!acessos.get(recursoId)?.aprovacao : true),
      carregando: acessos === null,
    };
  }, [acessos]);

  return <PermissoesContext.Provider value={valor}>{children}</PermissoesContext.Provider>;
}

export function usePermissoes(): Contexto {
  const ctx = useContext(PermissoesContext);
  if (!ctx) throw new Error('usePermissoes precisa estar dentro de PermissoesProvider');
  return ctx;
}
