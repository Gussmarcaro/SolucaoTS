import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Loader2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { SeletorPagina } from '@/components/ui/SeletorPagina';
import { usePageSize } from '@/lib/paginacao';
import { extrairMensagemErro } from '@/services/http';
import { acessosApi, type FiltrosAcesso } from '@/services/acessos.service';
import {
  dataDe,
  formatarDuracao,
  horaDe,
  hojeLocal,
  SITUACAO_LABEL,
  SITUACAO_TONE,
  type SessaoAcesso,
} from '@/types/acesso';

/**
 * Histórico de Acessos — quem entrou no sistema, quando e até quando ficou.
 *
 * Irmã da tela de Auditoria: aquela responde "quem alterou o quê", esta
 * responde "quem esteve aqui". As duas são **só leitura** — não há botão de
 * editar nem de excluir em lugar nenhum desta tela, e é proposital: um
 * histórico que a interface pode corrigir deixa de valer como histórico.
 */

const SITUACOES = [
  { value: 'ABERTA', label: 'Aberta' },
  { value: 'ENCERRADA', label: 'Encerrada' },
  { value: 'ENCERRADA_INESPERADAMENTE', label: 'Encerrada inesperadamente' },
];

/**
 * Colunas ordenáveis — as três que existem no banco.
 *
 * "Tempo" e "Situação" são derivadas na leitura e não têm coluna para o SQL
 * ordenar; oferecer a seta nelas prometeria uma ordem que a paginação não
 * conseguiria manter. Quem responde à mesma pergunta em "Situação" é o filtro,
 * que recorta no banco.
 */
type Coluna = 'usuarioNome' | 'logonEm' | 'logoutEm';

export function Acessos() {
  const [filtros, setFiltros] = useState<FiltrosAcesso>({});
  const [ordenarPor, setOrdenarPor] = useState<Coluna>('logonEm');
  const [descendente, setDescendente] = useState(true);
  const [pageSize, setPageSize] = usePageSize('acessos');
  const [usuarios, setUsuarios] = useState<{ value: string; label: string }[]>([]);
  const [page, setPage] = useState(1);
  const [lista, setLista] = useState<SessaoAcesso[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    acessosApi
      .usuarios()
      .then((u) => setUsuarios(u.map((x) => ({ value: x.id, label: x.nome }))))
      .catch(() => setUsuarios([]));
  }, []);

  const consulta = useMemo(
    () => ({ ...filtros, ordenarPor, ordem: descendente ? 'desc' : 'asc' }),
    [filtros, ordenarPor, descendente],
  );

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    setErro(null);
    acessosApi
      .listar({ ...consulta, page, pageSize })
      .then((r) => {
        if (!vivo) return;
        setLista(r.data);
        setTotal(r.total);
        setTotalPages(r.totalPages);
      })
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Não foi possível carregar os acessos.')))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [consulta, page, pageSize]);

  useEffect(() => setPage(1), [consulta, pageSize]);

  const set = (campo: keyof FiltrosAcesso, valor: string) =>
    setFiltros((f) => ({ ...f, [campo]: valor || undefined }));

  /** Atalho do dia corrente — o recorte que mais se pede numa tela destas. */
  const hoje = () => {
    const d = hojeLocal();
    setFiltros((f) => ({ ...f, de: d, ate: d }));
  };

  /** Clicar na mesma coluna inverte; noutra, começa decrescente. */
  const ordenar = (coluna: Coluna) => {
    if (coluna === ordenarPor) {
      setDescendente((d) => !d);
      return;
    }
    setOrdenarPor(coluna);
    setDescendente(true);
  };

  const temFiltro = !!(filtros.de || filtros.ate || filtros.usuarioId || filtros.situacao);

  return (
    <>
      <PageHeader
        title="Histórico de Acessos"
        subtitle="Entradas e saídas do sistema, com duração e origem. Registro permanente — não editável."
      />

      <div className="overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-card dark:border-ink-800/70 dark:bg-ink-900">
        <div className="space-y-3 border-b border-ink-100 p-4 dark:border-ink-800">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Input
              name="de"
              label="De"
              type="date"
              value={filtros.de ?? ''}
              onChange={(e) => set('de', e.target.value)}
            />
            <Input
              name="ate"
              label="Até"
              type="date"
              value={filtros.ate ?? ''}
              onChange={(e) => set('ate', e.target.value)}
            />
            <Select
              name="usuarioId"
              label="Usuário"
              value={filtros.usuarioId ?? ''}
              onChange={(e) => set('usuarioId', e.target.value)}
              options={usuarios}
              placeholder="Todos"
            />
            <Select
              name="situacao"
              label="Situação"
              value={filtros.situacao ?? ''}
              onChange={(e) => set('situacao', e.target.value)}
              options={SITUACOES}
              placeholder="Todas"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={hoje}>
              <CalendarDays className="h-4 w-4" />
              Hoje
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setFiltros({})} disabled={!temFiltro}>
              <Eraser className="h-4 w-4" />
              Limpar filtros
            </Button>
          </div>
        </div>

        {carregando ? (
          <div className="py-16 text-center">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-brand-500" />
          </div>
        ) : erro ? (
          <p className="py-16 text-center text-sm font-medium text-red-500">{erro}</p>
        ) : lista.length === 0 ? (
          <p className="py-16 text-center text-sm text-ink-500 dark:text-ink-400">
            Nenhum acesso com esses filtros.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-ink-100 text-xs uppercase tracking-wider text-ink-400 dark:border-ink-800">
                <tr>
                  <Cabecalho coluna="usuarioNome" atual={ordenarPor} desc={descendente} ao={ordenar}>
                    Usuário
                  </Cabecalho>
                  <Cabecalho coluna="logonEm" atual={ordenarPor} desc={descendente} ao={ordenar}>
                    Logon
                  </Cabecalho>
                  <Cabecalho coluna="logoutEm" atual={ordenarPor} desc={descendente} ao={ordenar}>
                    Logout
                  </Cabecalho>
                  <th className="px-4 py-2.5 font-medium">Tempo</th>
                  <th className="px-4 py-2.5 font-medium">Situação</th>
                  <th className="px-4 py-2.5 font-medium">Origem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                {lista.map((s) => (
                  <tr
                    key={s.id}
                    className="transition-colors hover:bg-ink-50/70 dark:hover:bg-ink-800/40"
                  >
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-ink-800 dark:text-ink-100">{s.usuarioNome}</div>
                      <div className="text-xs text-ink-400">{s.usuarioEmail}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-ink-700 dark:text-ink-200">
                      {dataDe(s.logonEm)}
                      <span className="ml-2 text-ink-400">{horaDe(s.logonEm)}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-ink-700 dark:text-ink-200">
                      {s.logoutEm ? (
                        <>
                          {dataDe(s.logoutEm)}
                          <span className="ml-2 text-ink-400">{horaDe(s.logoutEm)}</span>
                        </>
                      ) : (
                        // Sem logout explícito não há hora de saída a mostrar. O
                        // que se sabe é até quando houve sinal de vida, e é isso
                        // que a coluna Tempo usa — inventar um horário aqui seria
                        // afirmar um instante que ninguém registrou.
                        <span className="text-ink-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-ink-700 dark:text-ink-200">
                      {formatarDuracao(s.minutos)}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={SITUACAO_TONE[s.situacao]}>{SITUACAO_LABEL[s.situacao]}</Badge>
                      {s.lembrar && (
                        <span className="ml-2 text-xs text-ink-400" title="Sessão de 30 dias">
                          lembrar
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="text-ink-700 dark:text-ink-200">{s.ip ?? '—'}</div>
                      {s.navegador && (
                        <div
                          className="max-w-[22rem] truncate text-xs text-ink-400"
                          title={s.navegador}
                        >
                          {s.navegador}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col items-center justify-between gap-3 border-t border-ink-100 px-4 py-3 text-xs text-ink-400 dark:border-ink-800 sm:flex-row">
          <span>{total} acesso(s)</span>
          <SeletorPagina valor={pageSize} onChange={setPageSize} total={total} />
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1 || carregando}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <span>
              Página {page} de {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages || carregando}
              onClick={() => setPage((p) => p + 1)}
            >
              Próximo
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/*
        A nota existe porque "Encerrada inesperadamente" é a linha que mais gera
        dúvida — sem explicação ela parece indicar defeito, quando é o
        comportamento normal de quem fecha a aba. Fica fora da tabela, uma vez
        só: repetida linha a linha viraria ruído.
      */}
      <p className="mt-3 text-xs leading-relaxed text-ink-400">
        <strong className="font-medium">Encerrada inesperadamente</strong> é o caso comum: fechar a
        aba, perder a conexão ou desligar o computador não avisam o servidor. Nesses acessos, o
        tempo é contado até a última atividade registrada, não até agora. O registro é permanente e
        não pode ser alterado nem excluído por esta tela.
      </p>
    </>
  );
}

function Cabecalho({
  coluna,
  atual,
  desc,
  ao,
  children,
}: {
  coluna: Coluna;
  atual: Coluna;
  desc: boolean;
  ao: (c: Coluna) => void;
  children: ReactNode;
}) {
  const ativa = coluna === atual;
  return (
    <th className="px-4 py-2.5 font-medium">
      <button
        type="button"
        onClick={() => ao(coluna)}
        className="focus-ring inline-flex items-center gap-1 rounded uppercase tracking-wider transition-colors hover:text-ink-600 dark:hover:text-ink-200"
      >
        {children}
        {ativa && (desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
      </button>
    </th>
  );
}
