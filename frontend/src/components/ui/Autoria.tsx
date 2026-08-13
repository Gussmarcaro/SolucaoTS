import { useEffect, useState } from 'react';
import { UserRound } from 'lucide-react';
import { dataBr } from '@/lib/masks';
import { http } from '@/services/http';

interface Resposta {
  criadoPorNome: string | null;
  criadoEm: string | null;
}

/**
 * "Incluído por Fulano em 12/08/2026" no rodapé de uma visualização.
 *
 * Busca sob demanda, ao abrir o registro: a autoria interessa quando alguém
 * está olhando um cadastro específico, e carregá-la em toda listagem custaria
 * uma consulta por linha para um dado que quase nunca é lido.
 *
 * Registro anterior à auditoria não tem autor, e nesses casos o componente
 * simplesmente não aparece — melhor o silêncio que "Incluído por —".
 */
export function Autoria({ entidade, id }: { entidade: string; id: string }) {
  const [dados, setDados] = useState<Resposta | null>(null);

  useEffect(() => {
    let vivo = true;
    http
      .get<Resposta>(`/autoria/${entidade}/${id}`)
      .then((r) => vivo && setDados(r.data))
      .catch(() => vivo && setDados(null));
    return () => {
      vivo = false;
    };
  }, [entidade, id]);

  if (!dados?.criadoPorNome && !dados?.criadoEm) return null;

  return (
    <p className="flex items-center gap-1.5 border-t border-ink-100 pt-3 text-xs text-ink-400 dark:border-ink-800">
      <UserRound className="h-3.5 w-3.5" />
      Incluído
      {dados.criadoPorNome ? (
        <>
          {' por '}
          <span className="font-medium text-ink-600 dark:text-ink-300">{dados.criadoPorNome}</span>
        </>
      ) : null}
      {dados.criadoEm ? ` em ${dataBr(dados.criadoEm)}` : null}
    </p>
  );
}
