import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, FileWarning, Lock, MapPin, Repeat, Users } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { listarCompromissos, resumoAgenda } from '@/services/compromissos.service';
import { cn } from '@/lib/cn';
import {
  TIPO_LABEL,
  classeDaCor,
  horaBr,
  type Compromisso,
  type ResumoAgenda,
} from '@/types/compromisso';

/** Janela do painel: uma semana à frente. */
const DIAS_ADIANTE = 7;
/** Quantos compromissos cabem antes de a lista virar papel de parede. */
const MAX_ITENS = 5;

/** 'Hoje', 'Amanhã' ou o dia da semana — mais legível que a data crua aqui. */
function quando(iso: string): string {
  const d = new Date(iso);
  const hoje = new Date();
  const dia = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((dia(d) - dia(hoje)) / 86_400_000);
  if (diff <= 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

/**
 * A agenda na tela de entrada — o que vem pela frente e o que ficou para trás.
 *
 * Um compromisso é a única coisa do sistema que tem **hora marcada**: prazo se
 * cumpre até o fim do dia, reunião começa às 14h30. Quem abre o sistema de
 * manhã precisa ver isso antes de qualquer contagem de cadastro — e o sino, que
 * avisa em minutos, só fala quando já está quase em cima.
 *
 * Duas leituras, lado a lado de propósito:
 *
 * - **Os próximos 7 dias**, para saber o que preparar;
 * - **Sem registro**, que é a exceção: compromissos que já passaram e continuam
 *   `AGENDADO` — ninguém escreveu o que foi tratado. É o número que some quando
 *   o acompanhamento está em dia, e é dele que nasce a providência.
 *
 * Reusa `GET /compromissos` com a mesma janela e a mesma visibilidade da tela da
 * Agenda: um particular de outra pessoa não aparece aqui, como não aparece lá.
 * Consulta própria seria a chance de o Dashboard mostrar o que a Agenda esconde.
 */
export function PainelAgenda() {
  const navigate = useNavigate();
  const [resumo, setResumo] = useState<ResumoAgenda | null>(null);
  const [proximos, setProximos] = useState<Compromisso[] | null>(null);
  /** Quantos há na janela, e não quantos couberam na lista. */
  const [naJanela, setNaJanela] = useState<number | null>(null);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    let vivo = true;
    const de = new Date();
    const ate = new Date();
    ate.setDate(ate.getDate() + DIAS_ADIANTE);
    ate.setHours(23, 59, 59, 999);

    Promise.all([
      resumoAgenda(),
      listarCompromissos({ de: de.toISOString(), ate: ate.toISOString(), status: 'AGENDADO' }),
    ])
      .then(([r, lista]) => {
        if (!vivo) return;
        setResumo(r);
        setNaJanela(lista.length);
        setProximos(lista.slice(0, MAX_ITENS));
      })
      .catch(() => vivo && setFalhou(true));
    return () => {
      vivo = false;
    };
  }, []);

  // Módulo nunca usado não ganha cartão: um painel vazio na tela de entrada só
  // ensina a ignorá-la. Basta um compromisso, passado ou futuro, para aparecer.
  const vazio =
    resumo && resumo.proximos === 0 && resumo.pendentesDeRegistro === 0 && resumo.realizados === 0;
  if (falhou || vazio) return null;

  return (
    // `mt-6`: a grade de cadastros logo acima não tem margem embaixo, e o bloco
    // de prazos logo abaixo já traz a sua própria no topo. Painel que fica
    // *antes* das contagens precisa do contrário (`mb-6`, como o PainelExecucao).
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-brand-500" />
          Agenda
        </CardTitle>
        <Link
          to="/agenda"
          className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-300"
        >
          Abrir agenda
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardBody className="pt-3">
        <div className="mb-3 flex divide-x divide-ink-100 rounded-xl bg-ink-50/70 dark:divide-ink-800 dark:bg-ink-800/30">
          {[
            { rotulo: 'Hoje', valor: resumo?.hoje },
            { rotulo: `Próximos ${DIAS_ADIANTE} dias`, valor: naJanela ?? undefined },
            { rotulo: 'Sem registro', valor: resumo?.pendentesDeRegistro, alerta: true },
            { rotulo: 'Realizados', valor: resumo?.realizados },
          ].map((n) => (
            <div key={n.rotulo} className="flex-1 px-3 py-2 text-center">
              <p
                className={cn(
                  'text-xl font-semibold tabular-nums',
                  n.alerta && n.valor
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-ink-800 dark:text-ink-100',
                )}
              >
                {n.valor ?? '—'}
              </p>
              <p className="mt-0.5 text-[11px] uppercase tracking-wide text-ink-400">{n.rotulo}</p>
            </div>
          ))}
        </div>

        {proximos === null ? (
          <p className="py-4 text-center text-sm text-ink-400">Carregando…</p>
        ) : proximos.length === 0 ? (
          <p className="py-4 text-sm text-ink-400">
            Nada agendado para os próximos {DIAS_ADIANTE} dias.
          </p>
        ) : (
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {proximos.map((c) => (
              <li
                key={c.id + c.inicioEm}
                onClick={() => navigate('/agenda')}
                className="flex cursor-pointer items-center gap-3 py-2.5 transition-colors hover:bg-ink-50/70 dark:hover:bg-ink-800/40"
              >
                <span className={cn('h-2 w-2 shrink-0 rounded-full', classeDaCor(c))} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-800 dark:text-ink-100">
                    {c.titulo}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 truncate text-xs text-ink-400">
                    <span>{TIPO_LABEL[c.tipo]}</span>
                    {c.ajusteCodigo && <span className="font-mono">{c.ajusteCodigo}</span>}
                    {c.local && (
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" />
                        {c.local}
                      </span>
                    )}
                    {/* Os mesmos ícones da Agenda: quem vê os dois não precisa
                        aprender dois vocabulários para a mesma coisa. */}
                    {c.visibilidade === 'PARTICULAR' && (
                      <Lock className="h-3 w-3" aria-label="Particular" />
                    )}
                    {c.visibilidade === 'RESTRITO' && (
                      <Users className="h-3 w-3" aria-label="Restrito" />
                    )}
                    {c.ocorrencia && <Repeat className="h-3 w-3" aria-label="Repetição" />}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-medium text-ink-700 dark:text-ink-200">
                    {quando(c.inicioEm)}
                  </p>
                  <p className="mt-0.5 text-xs tabular-nums text-ink-400">
                    {c.diaInteiro ? 'dia todo' : horaBr(c.inicioEm)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!!naJanela && naJanela > MAX_ITENS && (
          <Link
            to="/agenda"
            className="mt-2 block text-xs font-medium text-brand-600 hover:underline dark:text-brand-300"
          >
            + {naJanela - MAX_ITENS} compromisso(s) nos próximos {DIAS_ADIANTE} dias
          </Link>
        )}

        {/* A pendência sai da lista e vira chamada: ela não está nos próximos
            7 dias — está atrás, que é justamente o motivo de passar batida. */}
        {!!resumo?.pendentesDeRegistro && (
          <Link
            to="/agenda"
            className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
          >
            <FileWarning className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1">
              {resumo.pendentesDeRegistro} compromisso(s) já passaram e continuam sem registro do
              que foi tratado.
            </span>
            <Badge tone="warning">Registrar</Badge>
          </Link>
        )}
      </CardBody>
    </Card>
  );
}
