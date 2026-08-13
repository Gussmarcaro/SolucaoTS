import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  Building2,
  ClipboardCheck,
  FileText,
  FolderOpen,
  Landmark,
  Loader2,
  Search,
  Truck,
  UserCog,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useDebounce } from '@/hooks/useDebounce';
import { buscarGlobal } from '@/services/busca.service';
import { extrairMensagemErro } from '@/services/http';
import {
  TIPO_BUSCA_LABEL,
  rotaDoResultado,
  type ResultadoBusca,
  type TipoResultado,
} from '@/types/busca';

/** Espelha o mínimo do backend: menos que isso casaria com quase tudo. */
const MINIMO = 2;

const ICONES: Record<TipoResultado, LucideIcon> = {
  AJUSTE: FolderOpen,
  PRESTACAO: ClipboardCheck,
  ENTIDADE: Building2,
  FORNECEDOR: Truck,
  COLABORADOR: UserRound,
  CONTRATO: FileText,
  BEM_CEDIDO: Boxes,
  SERVIDOR_CEDIDO: UserCog,
  ORGAO: Landmark,
};

interface Props {
  aberta: boolean;
  onFechar: () => void;
}

/**
 * Busca global da barra superior.
 *
 * Uma consulta só, para todos os cadastros: o backend percorre ajustes,
 * prestações, entidades, fornecedores, colaboradores, contratos, bens,
 * servidores e órgãos, e a lista agrupa o resultado por tipo.
 */
export function BuscaGlobal({ aberta, onFechar }: Props) {
  const navigate = useNavigate();
  const campo = useRef<HTMLInputElement>(null);
  const [termo, setTermo] = useState('');
  const [resultados, setResultados] = useState<ResultadoBusca[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ativo, setAtivo] = useState(0);
  const termoDebounced = useDebounce(termo, 300);

  // O campo continua montado quando fechado (é o que permite animar a largura),
  // então o foco é movido na mão.
  useEffect(() => {
    if (aberta) campo.current?.focus();
    else {
      campo.current?.blur();
      setTermo('');
      setResultados(null);
      setErro(null);
    }
  }, [aberta]);

  useEffect(() => {
    const q = termoDebounced.trim();
    if (q.length < MINIMO) {
      setResultados(null);
      setCarregando(false);
      return;
    }
    // `AbortController`: com a digitação rápida, uma resposta antiga poderia
    // chegar depois da nova e sobrescrever a lista certa.
    const controlador = new AbortController();
    setCarregando(true);
    setErro(null);
    buscarGlobal(q, controlador.signal)
      .then((r) => {
        setResultados(r);
        setAtivo(0);
      })
      .catch((e) => {
        if (controlador.signal.aborted) return;
        setErro(extrairMensagemErro(e, 'Não foi possível buscar agora.'));
        setResultados([]);
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCarregando(false);
      });
    return () => controlador.abort();
  }, [termoDebounced]);

  /** Mantém a ordem que o backend devolveu, apenas juntando por tipo. */
  const grupos = useMemo(() => {
    if (!resultados) return [];
    const mapa = new Map<TipoResultado, ResultadoBusca[]>();
    for (const r of resultados) {
      const lista = mapa.get(r.tipo) ?? [];
      lista.push(r);
      mapa.set(r.tipo, lista);
    }
    return [...mapa.entries()];
  }, [resultados]);

  /** Lista achatada — é sobre ela que as setas do teclado andam. */
  const navegaveis = useMemo(() => grupos.flatMap(([, itens]) => itens), [grupos]);

  function abrir(r: ResultadoBusca) {
    navigate(rotaDoResultado(r));
    onFechar();
  }

  function aoTeclar(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') return onFechar();
    if (!navegaveis.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAtivo((i) => (i + 1) % navegaveis.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAtivo((i) => (i - 1 + navegaveis.length) % navegaveis.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      abrir(navegaveis[ativo]);
    }
  }

  const curto = termo.trim().length > 0 && termo.trim().length < MINIMO;
  const mostrarPainel = aberta && (carregando || curto || !!erro || resultados !== null);

  return (
    <div
      aria-hidden={!aberta}
      className={cn(
        'relative ml-auto hidden shrink-0 transition-[width,opacity] duration-200 sm:block',
        aberta ? 'w-72 opacity-100 lg:w-96' : 'w-0 overflow-hidden opacity-0',
      )}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
      <input
        ref={campo}
        type="text"
        role="combobox"
        aria-expanded={mostrarPainel}
        aria-controls="resultados-busca"
        autoComplete="off"
        tabIndex={aberta ? 0 : -1}
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        onKeyDown={aoTeclar}
        // O clique num resultado passa pelo blur; o `mousedown` do painel o
        // impede, então aqui só chega o clique fora de verdade.
        onBlur={onFechar}
        placeholder="Buscar ajustes, entidades, contratos..."
        className="focus-ring h-10 w-full rounded-xl border border-ink-200 bg-ink-50 pl-10 pr-9 text-sm text-ink-800 placeholder:text-ink-400 transition-colors dark:border-ink-800 dark:bg-ink-900 dark:text-ink-100"
      />
      {carregando && (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ink-400" />
      )}

      {mostrarPainel && (
        <div
          id="resultados-busca"
          role="listbox"
          onMouseDown={(e) => e.preventDefault()}
          className="absolute right-0 top-12 max-h-[70vh] w-[22rem] overflow-y-auto rounded-2xl border border-ink-200 bg-white py-2 shadow-pop dark:border-ink-800 dark:bg-ink-900 lg:w-[26rem]"
        >
          {curto ? (
            <p className="px-4 py-3 text-sm text-ink-400">Digite ao menos {MINIMO} caracteres.</p>
          ) : erro ? (
            <p className="px-4 py-3 text-sm text-red-500">{erro}</p>
          ) : resultados && resultados.length === 0 && !carregando ? (
            <p className="px-4 py-3 text-sm text-ink-400">
              Nada encontrado para “{termo.trim()}”.
            </p>
          ) : (
            grupos.map(([tipo, itens]) => {
              const Icone = ICONES[tipo];
              return (
                <div key={tipo}>
                  <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                    {TIPO_BUSCA_LABEL[tipo]}
                  </p>
                  {itens.map((r) => {
                    const indice = navegaveis.indexOf(r);
                    return (
                      <button
                        key={`${tipo}-${r.id}`}
                        type="button"
                        role="option"
                        aria-selected={indice === ativo}
                        onMouseEnter={() => setAtivo(indice)}
                        onClick={() => abrir(r)}
                        className={cn(
                          'flex w-full items-center gap-2.5 px-4 py-2 text-left transition-colors',
                          indice === ativo ? 'bg-ink-100 dark:bg-ink-800' : 'hover:bg-ink-50 dark:hover:bg-ink-800/60',
                        )}
                      >
                        <Icone className="h-4 w-4 shrink-0 text-ink-400" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm text-ink-800 dark:text-ink-100">
                            {r.titulo}
                          </span>
                          {r.subtitulo && (
                            <span className="block truncate text-xs text-ink-400">{r.subtitulo}</span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
