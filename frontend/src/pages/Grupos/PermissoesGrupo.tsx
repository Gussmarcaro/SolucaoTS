import { useEffect, useMemo, useState } from 'react';
import { Loader2, Save, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { extrairMensagemErro } from '@/services/http';
import { permissoesApi } from '@/services/permissoes.service';
import {
  NIVEIS,
  type AcessoDoRecurso,
  type NivelPermissao,
  type Recurso,
} from '@/types/permissao';
import type { Grupo } from '@/types/grupo';

/** Cor da faixa escolhida — o verde do "Total" precisa saltar na varredura. */
const TOM: Record<NivelPermissao, string> = {
  SEM_ACESSO: 'bg-ink-200 text-ink-700 dark:bg-ink-700 dark:text-ink-200',
  CONSULTA: 'bg-brand-100 text-brand-800 dark:bg-brand-500/20 dark:text-brand-200',
  EDICAO: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
  TOTAL: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
};

/**
 * Matriz de permissões de um grupo: uma linha por tela, uma faixa por linha.
 *
 * A tela envia sempre o estado completo, nunca as diferenças. Numa tela de
 * acesso, uma permissão que sobra de uma configuração anterior é falha de
 * segurança — e comparar item a item é justamente onde sobra passa.
 */
export function PermissoesGrupo({ grupo }: { grupo: Grupo }) {
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [acessos, setAcessos] = useState<Map<string, AcessoDoRecurso>>(new Map());
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    Promise.all([permissoesApi.recursos(), permissoesApi.doGrupo(grupo.id)])
      .then(([cat, atuais]) => {
        if (!vivo) return;
        setRecursos(cat);
        setAcessos(new Map(atuais.map((a) => [a.recursoId, a])));
        setErro(null);
      })
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Não foi possível carregar as permissões.')))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [grupo.id]);

  const secoes = useMemo(() => {
    const mapa = new Map<string, Recurso[]>();
    for (const r of recursos) mapa.set(r.secao, [...(mapa.get(r.secao) ?? []), r]);
    return [...mapa.entries()];
  }, [recursos]);

  function definir(recursoId: string, mudanca: Partial<AcessoDoRecurso>) {
    setSalvo(false);
    setAcessos((atual) => {
      const copia = new Map(atual);
      const anterior = copia.get(recursoId) ?? { recursoId, nivel: 'SEM_ACESSO' as NivelPermissao };
      const novo = { ...anterior, ...mudanca };
      // Sem acesso e transmitir são contraditórios; o servidor recusa, e aqui a
      // marca some sozinha em vez de deixar o usuário salvar para descobrir.
      if (novo.nivel === 'SEM_ACESSO') novo.aprovacao = false;
      copia.set(recursoId, novo);
      return copia;
    });
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      await permissoesApi.salvar(
        grupo.id,
        recursos.map((r) => acessos.get(r.id) ?? { recursoId: r.id, nivel: 'SEM_ACESSO' }),
      );
      setSalvo(true);
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível salvar.'));
    } finally {
      setSalvando(false);
    }
  }

  if (carregando)
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
      </div>
    );

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-600 dark:text-ink-300">
        O que o grupo <strong>{grupo.nome}</strong> pode fazer em cada tela. A alteração vale em
        poucos segundos, sem ninguém precisar sair e entrar de novo.
      </p>

      {erro && <p className="text-sm font-medium text-red-500">{erro}</p>}

      {secoes.map(([secao, itens]) => (
        <div key={secao}>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            {secao}
          </p>
          <div className="overflow-hidden rounded-xl border border-ink-200 dark:border-ink-800">
            {itens.map((r, i) => {
              const acesso = acessos.get(r.id) ?? { recursoId: r.id, nivel: 'SEM_ACESSO' as const };
              return (
                <div
                  key={r.id}
                  className={cn(
                    'flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between',
                    i > 0 && 'border-t border-ink-100 dark:border-ink-800',
                  )}
                >
                  <div className="min-w-0">
                    <span className="text-[13px] text-ink-800 dark:text-ink-100">{r.rotulo}</span>
                    {r.restrito && (
                      <span className="ml-2">
                        <Badge tone="warning">administração</Badge>
                      </span>
                    )}
                    {r.temAprovacao && (
                      <label className="mt-1 flex items-center gap-1.5 text-xs text-ink-500 dark:text-ink-400">
                        <input
                          type="checkbox"
                          checked={!!acesso.aprovacao}
                          disabled={acesso.nivel === 'SEM_ACESSO'}
                          onChange={(e) => definir(r.id, { aprovacao: e.target.checked })}
                          className="rounded border-ink-300 dark:border-ink-700"
                        />
                        Pode transmitir ao TCESP
                      </label>
                    )}
                  </div>

                  {/* Faixas como botões lado a lado: a escolha e as alternativas
                      ficam visíveis ao mesmo tempo, o que um select esconderia. */}
                  <div className="flex shrink-0 gap-1">
                    {NIVEIS.map((n) => (
                      <button
                        key={n.valor}
                        type="button"
                        title={n.ajuda}
                        onClick={() => definir(r.id, { nivel: n.valor })}
                        className={cn(
                          'focus-ring rounded-lg px-2.5 py-1 text-xs transition-colors',
                          acesso.nivel === n.valor
                            ? TOM[n.valor]
                            : 'text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800',
                        )}
                      >
                        {n.rotulo}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex items-center justify-end gap-3 border-t border-ink-100 pt-3 dark:border-ink-800">
        {salvo && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-4 w-4" /> Permissões salvas.
          </span>
        )}
        <Button onClick={salvar} disabled={salvando}>
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar permissões
        </Button>
      </div>
    </div>
  );
}
