import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { listarTarefas, resumoTarefas } from '@/services/tarefas.service';
import { dataBr } from '@/lib/masks';
import { rotuloPrazo, type ResumoTarefas, type Tarefa } from '@/types/tarefa';

/**
 * O que o acompanhamento está devendo, na tela de entrada.
 *
 * O sino avisa e a Fiscalização registra — mas as duas coisas só aparecem se
 * alguém for até lá. Uma tarefa atrasada é, por definição, algo que já passou
 * despercebido; repeti-la na primeira tela é o mínimo.
 *
 * Mostra as atrasadas, não as abertas: aberta é trabalho normal, atrasada é
 * exceção. Uma lista de tudo que há para fazer viraria papel de parede.
 */
export function PainelFiscalizacao() {
  const navigate = useNavigate();
  const [resumo, setResumo] = useState<ResumoTarefas | null>(null);
  const [atrasadas, setAtrasadas] = useState<Tarefa[] | null>(null);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    let vivo = true;
    Promise.all([
      resumoTarefas(),
      listarTarefas({ filtros: { atrasadas: true }, page: 1, pageSize: 5, orderBy: 'prazoLegal', orderDir: 'asc' }),
    ])
      .then(([r, lista]) => {
        if (!vivo) return;
        setResumo(r);
        setAtrasadas(lista.data);
      })
      .catch(() => vivo && setFalhou(true));
    return () => {
      vivo = false;
    };
  }, []);

  // Sem tarefa nenhuma o módulo ainda não entrou em uso — um cartão vazio na
  // tela de entrada só ensinaria a ignorá-lo.
  if (falhou || (resumo && resumo.abertas === 0 && resumo.concluidas === 0)) return null;

  const numero = (rotulo: string, valor: number | undefined, alerta?: boolean) => (
    <div className="flex-1 px-3 py-2 text-center">
      <p className={`text-xl font-semibold tabular-nums ${alerta && valor ? 'text-red-600 dark:text-red-400' : 'text-ink-800 dark:text-ink-100'}`}>
        {valor ?? '—'}
      </p>
      <p className="mt-0.5 text-[11px] uppercase tracking-wide text-ink-400">{rotulo}</p>
    </div>
  );

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-brand-500" />
          Fiscalização
        </CardTitle>
        <Link
          to="/fiscalizacao"
          className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-300"
        >
          Ver todas
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardBody className="pt-3">
        <div className="mb-3 flex divide-x divide-ink-100 rounded-xl bg-ink-50/70 dark:divide-ink-800 dark:bg-ink-800/30">
          {numero('Em aberto', resumo?.abertas)}
          {numero('Atrasadas', resumo?.atrasadas, true)}
          {numero('Vencem em 7 dias', resumo?.venceEm7Dias)}
          {numero('Concluídas', resumo?.concluidas)}
        </div>

        {atrasadas === null ? (
          <p className="py-4 text-center text-sm text-ink-400">Carregando…</p>
        ) : atrasadas.length === 0 ? (
          <p className="flex items-center gap-2 py-4 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> Nenhuma providência atrasada.
          </p>
        ) : (
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {atrasadas.map((t) => (
              <li
                key={t.id}
                onClick={() => navigate('/fiscalizacao')}
                className="flex cursor-pointer items-center justify-between gap-4 py-2.5 transition-colors hover:bg-ink-50/70 dark:hover:bg-ink-800/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-800 dark:text-ink-100">{t.titulo}</p>
                  <p className="mt-0.5 truncate text-xs text-ink-400">
                    {t.ajusteCodigo ? `${t.ajusteCodigo} · ` : ''}
                    prazo em {dataBr(t.prazoLegal)}
                    {t.responsavelNome ? ` · ${t.responsavelNome}` : ''}
                  </p>
                </div>
                <Badge tone="danger">
                  <TriangleAlert className="h-3 w-3" />
                  {rotuloPrazo(t)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
