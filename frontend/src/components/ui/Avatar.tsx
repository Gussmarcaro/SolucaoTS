import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { http } from '@/services/http';

/**
 * O rosto do usuário — ou as iniciais dele.
 *
 * **As iniciais não são o caso de erro; são o caso comum.** A maioria das
 * pessoas nunca sobe foto, e uma silhueta cinza repetida quinze vezes numa
 * grade parece defeito. Iniciais sobre cor derivada do nome informam quem é,
 * parecem propositais, e evitam a tela onde só o chefe tem rosto.
 */

/** Primeira e última inicial — "Maria Silva Souza" vira "MS". */
function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '?';
  const primeira = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? '') : '';
  return (primeira + ultima).toUpperCase();
}

/**
 * Cor estável por pessoa, tirada do próprio nome.
 *
 * Determinística de propósito: a mesma pessoa tem sempre a mesma cor, em todas
 * as telas e entre sessões. Cor sorteada a cada render faria a grade piscar e
 * tiraria das iniciais a única coisa que as torna reconhecíveis de relance.
 *
 * As classes estão **por extenso**, como as cores da Agenda: o Tailwind só
 * gera o que consegue ler no código, e classe montada em tempo de execução
 * passa no typecheck sem pintar nada.
 */
const CORES = [
  'bg-gradient-to-br from-brand-500 to-brand-700',
  'bg-gradient-to-br from-emerald-500 to-emerald-700',
  'bg-gradient-to-br from-amber-500 to-amber-700',
  'bg-gradient-to-br from-rose-500 to-rose-700',
  'bg-gradient-to-br from-violet-500 to-violet-700',
  'bg-gradient-to-br from-cyan-500 to-cyan-700',
];

function corDe(nome: string): string {
  let soma = 0;
  for (let i = 0; i < nome.length; i += 1) soma = (soma + nome.charCodeAt(i)) % 997;
  return CORES[soma % CORES.length];
}

/**
 * Cache das fotos já baixadas, por `id:versao`.
 *
 * Existe porque a foto **não pode** ser carregada por `<img src="/api/…">`: a
 * API exige `Authorization: Bearer`, e a tag `img` não manda cabeçalho. Então
 * a imagem vem pelo cliente HTTP autenticado e vira uma URL `blob:`.
 *
 * Sem este mapa, a mesma foto seria baixada uma vez por componente — a barra
 * superior, cada linha da grade, cada participante da agenda. A chave inclui a
 * versão, então trocar a foto invalida a entrada sozinha, sem ninguém limpar
 * nada.
 *
 * As URLs não são revogadas: são poucas (uma por pessoa visível) e vivem o
 * tempo da aba. Revogá-las no desmonte quebraria os outros componentes que
 * apontam para a mesma.
 */
const cache = new Map<string, Promise<string>>();

function urlDaFoto(usuarioId: string, versao: string): Promise<string> {
  const chave = `${usuarioId}:${versao}`;
  const existente = cache.get(chave);
  if (existente) return existente;

  const promessa = http
    .get<Blob>(`/usuarios/${usuarioId}/foto`, { responseType: 'blob' })
    .then((r) => URL.createObjectURL(r.data))
    .catch((e) => {
      // Falha não fica no cache: a próxima montagem tenta de novo, em vez de
      // congelar as iniciais para sempre por causa de uma rede instável.
      cache.delete(chave);
      throw e;
    });

  cache.set(chave, promessa);
  return promessa;
}

const TAMANHOS = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
  xl: 'h-24 w-24 text-2xl',
} as const;

export interface AvatarProps {
  nome: string;
  /** Id do usuário — sem ele não há foto a buscar, e ficam as iniciais. */
  usuarioId?: string | null;
  /**
   * Carimbo da última troca de foto. **Faz parte da chave do cache**: sem ele
   * a imagem antiga continuaria sendo servida justamente depois da troca, que
   * é o momento em que a pessoa está olhando para a tela esperando a nova.
   *
   * `null` significa "não tem foto" — e aí nem se pede a imagem.
   */
  fotoVersao?: string | null;
  tamanho?: keyof typeof TAMANHOS;
  className?: string;
}

export function Avatar({ nome, usuarioId, fotoVersao, tamanho = 'md', className }: AvatarProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!usuarioId || !fotoVersao) {
      setSrc(null);
      return;
    }
    let vivo = true;
    urlDaFoto(usuarioId, fotoVersao)
      .then((u) => vivo && setSrc(u))
      // Foto apagada noutra aba, rede fora: cai para as iniciais, em vez de
      // deixar o ícone de imagem quebrada.
      .catch(() => vivo && setSrc(null));
    return () => {
      vivo = false;
    };
  }, [usuarioId, fotoVersao]);

  const base = clsx(
    'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg font-bold text-white select-none',
    TAMANHOS[tamanho],
    className,
  );

  if (src) {
    return <img src={src} alt={nome} className={clsx(base, 'bg-ink-200 object-cover dark:bg-ink-700')} />;
  }

  return (
    <span className={clsx(base, corDe(nome))} title={nome}>
      {iniciais(nome)}
    </span>
  );
}
