import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowRight, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissoes } from '@/contexts/PermissoesContext';
import { PainelAgenda } from './PainelAgenda';
import { PainelExecucao } from './PainelExecucao';
import { PainelFiscalizacao } from './PainelFiscalizacao';
import { FaixaCadastros } from './FaixaCadastros';
import { PainelFornecedores } from './PainelFornecedores';
import { PainelRepasses } from './PainelRepasses';
import { PainelSituacao } from './PainelSituacao';
import { listarAjustes } from '@/services/ajustes.service';
import { listarPrestacoes } from '@/services/prestacoes.service';
import { STATUS_PRESTACAO_LABEL, STATUS_PRESTACAO_TONE, type Prestacao } from '@/types/prestacao';
import { prazoPrestacao, diasAte, rotuloPrazo, tonePrazo } from '@/lib/prazos';

interface PrazoItem {
  id: string;
  orgao: string;
  periodo: string;
  vence: string;
  tone: 'danger' | 'warning' | 'neutral';
  dias: number;
}

function tempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'ontem' : `há ${d} dias`;
}

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function Dashboard() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  // Sem permissão o painel simplesmente não aparece — a regra da casa: quem
  // não tem acesso não vê aviso, vê a tela sem o item.
  const { pode } = usePermissoes();
  const primeiroNome = usuario?.nome?.trim().split(/\s+/)[0] ?? '';
  const [prazos, setPrazos] = useState<PrazoItem[] | null>(null);
  const [atividade, setAtividade] = useState<Prestacao[] | null>(null);
  const ciclo = prazoPrestacao();

  useEffect(() => {
    let vivo = true;
    const { exercicio, deadline } = prazoPrestacao();
    Promise.allSettled([
      listarAjustes({ page: 1, pageSize: 100 }),
      listarPrestacoes({ filtros: { ano: exercicio }, page: 1, pageSize: 100 }),
      listarPrestacoes({ orderBy: 'atualizadoEm', orderDir: 'desc', page: 1, pageSize: 5 }),
    ]).then((res) => {
      if (!vivo) return;
      const ajustes = res[0].status === 'fulfilled' ? res[0].value.data : [];
      const doExercicio = res[1].status === 'fulfilled' ? res[1].value.data : [];
      const recentes = res[2].status === 'fulfilled' ? res[2].value.data : [];

      const statusPorAjuste = new Map<string, string>();
      for (const p of doExercicio) {
        if (p.status === 'ARMAZENADO' || !statusPorAjuste.has(p.ajusteId)) statusPorAjuste.set(p.ajusteId, p.status);
      }
      const dias = diasAte(deadline);
      const itens: PrazoItem[] = ajustes
        .filter((a) => new Date(a.dataAssinatura).getFullYear() <= exercicio)
        .filter((a) => statusPorAjuste.get(a.id) !== 'ARMAZENADO')
        .map((a) => ({
          id: a.id,
          orgao: `${a.codigoAjuste} — ${a.entidadeNome}`,
          periodo: statusPorAjuste.get(a.id) === 'ENVIADO' ? `Exercício ${exercicio} · enviada, aguardando` : `Prestação do exercício ${exercicio}`,
          vence: rotuloPrazo(dias),
          tone: tonePrazo(dias),
          dias,
        }))
        .sort((x, y) => x.dias - y.dias)
        .slice(0, 6);
      setPrazos(itens);
      setAtividade(recentes);
    });
    return () => {
      vivo = false;
    };
  }, []);

  /*
   * As contagens dos cadastros saíram daqui.
   *
   * Eram **doze** requisições — duas por cadastro, cada uma uma listagem
   * paginada em `pageSize: 1` da qual se aproveitava só o campo `total`. Mais da
   * metade de tudo que esta tela pedia ao abrir, gasta no bloco que ocupava o
   * lugar mais nobre e era o menos acionável dela.
   *
   * Hoje são **uma**, em `FaixaCadastros`, no rodapé — e recortadas pela
   * permissão de cada cadastro, o que esta grade nunca fez.
   */

  return (
    <>
      <PageHeader
        title={`${saudacao()}${primeiroNome ? `, ${primeiroNome}` : ''} 👋`}
        subtitle="Aqui está o panorama das prestações de contas ao Terceiro Setor."
        actions={
          <Button variant="success" size="md" onClick={() => navigate('/cadastro/ajustes')}>
            <Plus className="h-4 w-4" />
            Novo Ajuste
          </Button>
        }
      />

      {pode('RELATORIOS', 'CONSULTA') && <PainelExecucao />}

      {/* Segundo painel, logo abaixo da execução: compromisso é a única coisa
          do sistema com hora marcada, e "quantos fornecedores tenho" não muda
          o que se faz hoje. O sino avisa em minutos — quando ele fala, já é
          quase em cima. */}
      {pode('AGENDA', 'CONSULTA') && <PainelAgenda />}

      {/* Análise — os três recortes que respondem a perguntas de fiscalização,
          não de contagem. Passaram a vir logo após a execução e a agenda: o
          lugar que as seis contagens de cadastro ocupavam.

          Cada painel some sozinho se a consulta falhar ou se não houver dado
          suficiente para comparar — e a seção inteira desaparece junto, porque
          um título sobre três espaços vazios é pior que nenhum título.

          Cada painel some sozinho se a consulta falhar ou se não houver dado
          suficiente para comparar — e a seção inteira desaparece junto, porque
          um título sobre três espaços vazios é pior que nenhum título. */}
      {/*
        `auto-fit` em vez de três colunas fixas, e a razão é visível na tela:
        cada painel some sozinho quando não tem dado que compare, mas a grade
        de `xl:grid-cols-3` continuava **reservando as três faixas**. Num órgão
        com dois ajustes e uma prestação, dois painéis desapareciam e sobrava
        dois terços de tela vazia ao lado do que restou.

        Com `auto-fit`, faixa sem item colapsa: um painel ocupa a linha, dois
        dividem, três repartem. Quem decide é o conteúdo, não um número escrito
        no layout — que é justamente o que um painel auto-ocultável exige.
      */}
      {pode('RELATORIOS', 'CONSULTA') && (
        <div className="mt-6 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr))]">
          <PainelSituacao />
          <PainelRepasses />
          <PainelFornecedores />
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Próximos prazos — Prestação de Contas (30/06) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Prazo da Prestação de Contas</CardTitle>
            <Badge tone="brand">Exercício {ciclo.exercicio}</Badge>
          </CardHeader>
          <CardBody className="pt-3">
            <p className="mb-3 text-xs text-ink-400">
              Entrega até <span className="font-medium text-ink-600 dark:text-ink-300">30/06/{ciclo.deadline.getFullYear()}</span> (repasses de {ciclo.exercicio}). Ajustes sem prestação <strong>Armazenada</strong>:
            </p>
            {prazos == null ? (
              <p className="py-6 text-center text-sm text-ink-400">Carregando…</p>
            ) : prazos.length === 0 ? (
              <p className="flex items-center gap-2 py-6 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> Nenhuma prestação pendente para o exercício {ciclo.exercicio}.
              </p>
            ) : (
              <ul className="divide-y divide-ink-100 dark:divide-ink-800">
                {prazos.map((p) => (
                  <li key={p.id} onClick={() => navigate('/prestacao-contas')} className="flex cursor-pointer items-center justify-between gap-4 py-3 transition-colors hover:bg-ink-50/70 dark:hover:bg-ink-800/40">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-medium text-ink-800 dark:text-ink-100">{p.orgao}</p>
                      <p className="mt-0.5 text-xs text-ink-400">{p.periodo}</p>
                    </div>
                    <Badge tone={p.tone}>{p.vence}</Badge>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 flex items-center gap-1 text-xs text-ink-400">
              <ArrowRight className="h-3.5 w-3.5" />
              Os prazos de cadastro (dias úteis) dependem do calendário oficial de feriados — não exibidos aqui.
            </p>
          </CardBody>
        </Card>

        {/* Atividade recente — prestações */}
        <Card>
          <CardHeader>
            <CardTitle>Prestações recentes</CardTitle>
          </CardHeader>
          <CardBody className="pt-3">
            {atividade == null ? (
              <p className="py-6 text-center text-sm text-ink-400">Carregando…</p>
            ) : atividade.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-400">Nenhuma prestação ainda.</p>
            ) : (
              <ul className="space-y-3">
                {atividade.map((p) => (
                  <li key={p.id} onClick={() => navigate(`/prestacao-contas/${p.id}`)} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg p-1.5 transition-colors hover:bg-ink-50/70 dark:hover:bg-ink-800/40">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm text-ink-700 dark:text-ink-200">{p.ajusteCodigo}</p>
                      <p className="mt-0.5 text-xs text-ink-400">Exercício {p.ano} · {tempoRelativo(p.atualizadoEm)}</p>
                    </div>
                    <Badge tone={STATUS_PRESTACAO_TONE[p.status]}>{STATUS_PRESTACAO_LABEL[p.status]}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
      {pode('FISCALIZACAO', 'CONSULTA') && <PainelFiscalizacao />}

      {/* Os cadastros fecham a tela em vez de abri-la. Continuam a um clique —
          só deixaram de disputar o lugar mais nobre com o que decide o dia. */}
      <FaixaCadastros />

    </>
  );
}