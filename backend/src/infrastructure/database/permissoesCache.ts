import { prisma } from './prisma';
import type { AcaoPermissao } from '@/core/permissao/Recurso';

/** recurso → ações concedidas. */
type Concessoes = Map<string, Set<AcaoPermissao>>;

interface Entrada {
  concessoes: Concessoes;
  expiraEm: number;
}

/**
 * Vida do cache. Curta de propósito: alterar a permissão de um grupo passa a
 * valer em segundos, sem obrigar ninguém a sair e entrar de novo.
 */
const TTL_MS = 30_000;

const cache = new Map<string, Entrada>();

/**
 * Marca que um grupo já passou pela tela de permissões.
 *
 * Existe para separar "nunca configurado" de "configurado para não acessar
 * nada". Sem ela, as duas situações seriam a mesma linha zero no banco — e
 * quem restringisse um grupo até o fim acabaria liberando tudo para ele, o
 * oposto exato da intenção.
 *
 * É gravada como uma permissão comum, num módulo reservado que nenhum recurso
 * usa, então não precisou de coluna nova no schema.
 */
export const MARCA_CONFIGURADO = '__CONFIGURADO__';

/**
 * O grupo ainda não tem permissões configuradas?
 *
 * Enquanto a resposta for sim, ele acessa tudo — o sistema funciona como antes
 * de existir controle, sem ninguém precisar rodar seed nem configurar nada para
 * entrar. Cada grupo passa a ser controlado no momento em que **ele** é
 * configurado, sem que a configuração de um afete os outros.
 */
export async function grupoSemPermissoes(grupoNome: string): Promise<boolean> {
  const concessoes = await permissoesDoGrupo(grupoNome);
  return concessoes.size === 0;
}

/**
 * Permissões de um grupo, lidas do banco.
 *
 * Ficam **fora do token JWT** de propósito. No token, mudar a permissão de um
 * grupo só valeria quando cada usuário fizesse login outra vez — e quem
 * configurasse alteraria, testaria e concluiria que não funciona. É o mesmo
 * sintoma que o `grupo` no token já causou.
 *
 * O preço é uma consulta por requisição, resolvido com um cache de 30s por
 * grupo: alteração aparece rápido e o banco não é consultado a cada clique.
 */
export async function permissoesDoGrupo(grupoNome: string): Promise<Concessoes> {
  const agora = Date.now();
  const emCache = cache.get(grupoNome);
  if (emCache && emCache.expiraEm > agora) return emCache.concessoes;

  const grupo = await prisma.grupoUsuario.findFirst({
    where: { nome: grupoNome, ativo: true },
    select: { permissoes: { select: { permissao: { select: { modulo: true, acao: true } } } } },
  });

  const concessoes: Concessoes = new Map();
  for (const p of grupo?.permissoes ?? []) {
    const { modulo, acao } = p.permissao;
    if (!concessoes.has(modulo)) concessoes.set(modulo, new Set());
    concessoes.get(modulo)!.add(acao as AcaoPermissao);
  }

  cache.set(grupoNome, { concessoes, expiraEm: agora + TTL_MS });
  return concessoes;
}

/** Descarta o cache — chamado ao gravar a matriz, para o efeito ser imediato. */
export function limparCachePermissoes(): void {
  cache.clear();
}
