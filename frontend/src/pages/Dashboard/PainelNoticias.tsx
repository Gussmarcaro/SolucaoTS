import { useEffect, useState } from 'react';
import { ExternalLink, Newspaper } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { noticiasTcesp, type Noticia, type NoticiasTcesp } from '@/services/noticias.service';

type Aba = 'comunicados' | 'noticias';

const ABAS: { chave: Aba; rotulo: string; site: string }[] = [
  { chave: 'comunicados', rotulo: 'Comunicados', site: 'https://www.tce.sp.gov.br/audesp/comunicados' },
  { chave: 'noticias', rotulo: 'Notícias', site: 'https://www.tce.sp.gov.br/noticias' },
];

/** O suficiente para ver o que há de novo sem empurrar o resto da tela. */
const MAX_ITENS = 6;

function dataCurta(iso: string | null): string {
  if (!iso) return '';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

function horaDe(iso: string | null): string {
  return iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
}

/**
 * Comunicados e notícias do TCESP no Dashboard.
 *
 * **Comunicados primeiro.** São eles que mudam o trabalho: "Consulta à situação
 * de entrega na Fase V", "Entidades proibidas de novos repasses", janelas de
 * indisponibilidade do Audesp. As notícias são institucionais (eventos,
 * prêmios), boas de saber, mas raramente pedem providência.
 *
 * **"Só do nosso assunto"** filtra o que fala de Audesp, Fase V, terceiro
 * setor ou repasses — o servidor marca essas como `destaque`, e elas aparecem
 * realçadas mesmo sem o filtro.
 *
 * O clique abre o site do Tribunal em outra aba: o sistema mostra a manchete e
 * leva à fonte, não reproduz o conteúdo. Sem dado nenhum (site fora do ar desde
 * que a API subiu), o painel não aparece.
 */
export function PainelNoticias() {
  const [dados, setDados] = useState<NoticiasTcesp | null>(null);
  const [falhou, setFalhou] = useState(false);
  const [aba, setAba] = useState<Aba>('comunicados');
  const [soAssunto, setSoAssunto] = useState(false);

  useEffect(() => {
    let vivo = true;
    noticiasTcesp()
      .then((d) => vivo && setDados(d))
      .catch(() => vivo && setFalhou(true));
    return () => {
      vivo = false;
    };
  }, []);

  if (falhou) return null;
  if (dados && dados.comunicados.itens.length === 0 && dados.noticias.itens.length === 0) return null;

  const atual = dados?.[aba];
  const todos: Noticia[] = atual?.itens ?? [];
  const lista = (soAssunto ? todos.filter((n) => n.destaque) : todos).slice(0, MAX_ITENS);
  const site = ABAS.find((a) => a.chave === aba)!.site;

  return (
    <Card className="mt-6">
      <CardHeader className="flex-wrap">
        <CardTitle className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-brand-500" />
          Notícias e Comunicados do TCESP
        </CardTitle>

        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-ink-500 dark:text-ink-400">
            <input
              type="checkbox"
              checked={soAssunto}
              onChange={(e) => setSoAssunto(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
            />
            Só Audesp e terceiro setor
          </label>

          <div className="flex rounded-lg bg-ink-100 p-0.5 dark:bg-ink-800" role="tablist">
            {ABAS.map((a) => (
              <button
                key={a.chave}
                role="tab"
                aria-selected={aba === a.chave}
                onClick={() => setAba(a.chave)}
                className={cn(
                  'focus-ring rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  aba === a.chave
                    ? 'bg-white text-ink-800 shadow-sm dark:bg-ink-900 dark:text-ink-100'
                    : 'text-ink-500 hover:text-ink-700 dark:text-ink-400 dark:hover:text-ink-200',
                )}
              >
                {a.rotulo}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardBody className="pt-3">
        {!dados ? (
          <p className="py-4 text-center text-sm text-ink-400">Carregando…</p>
        ) : lista.length === 0 ? (
          <p className="py-4 text-sm text-ink-400">
            {soAssunto
              ? 'Nada sobre Audesp ou terceiro setor entre os mais recentes.'
              : 'O site do TCESP não respondeu agora. Tente mais tarde.'}
          </p>
        ) : (
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {lista.map((n) => (
              <li key={n.link}>
                <a
                  href={n.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-3 rounded-lg px-1.5 py-2.5 transition-colors hover:bg-ink-50/70 dark:hover:bg-ink-800/40"
                >
                  <span className="w-[4.5rem] shrink-0 pt-0.5 text-xs tabular-nums text-ink-400">
                    {dataCurta(n.data)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'block text-sm leading-snug group-hover:underline',
                        n.destaque
                          ? 'font-medium text-ink-800 dark:text-ink-100'
                          : 'text-ink-600 dark:text-ink-300',
                      )}
                    >
                      {n.titulo}
                    </span>
                    {n.resumo && (
                      <span className="mt-0.5 line-clamp-1 block text-xs text-ink-400">{n.resumo}</span>
                    )}
                  </span>
                  {n.area && (
                    <Badge tone={n.destaque ? 'brand' : 'neutral'} className="shrink-0">
                      {n.area}
                      {n.numero ? ` ${n.numero}` : ''}
                    </Badge>
                  )}
                  {!n.area && n.destaque && (
                    <Badge tone="brand" className="shrink-0">
                      Audesp / 3º setor
                    </Badge>
                  )}
                </a>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-400">
          <span>
            Fonte: site do TCESP
            {atual?.lidoEm && ` · lido às ${horaDe(atual.lidoEm)}`}
            {atual?.desatualizado && atual.lidoEm && ' (o site não respondeu na última tentativa)'}
          </span>
          <a
            href={site}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 font-medium text-brand-600 hover:underline dark:text-brand-300"
          >
            Ver todos no site do TCESP
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </CardBody>
    </Card>
  );
}
