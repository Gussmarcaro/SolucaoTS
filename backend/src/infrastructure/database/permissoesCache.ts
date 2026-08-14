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

let configuradoEm = 0;
let configurado = false;

/**
 * O sistema já teve alguma permissão configurada?
 *
 * Enquanto a resposta for não, o gate fica aberto: um sistema recém-instalado
 * funciona como antes, sem ninguém precisar rodar seed nem configurar nada para
 * conseguir entrar. Na primeira configuração, o controle passa a valer.
 *
 * A pergunta é **global**, e isso é o que torna a regra segura. Se fosse por
 * grupo ("grupo sem permissão vê tudo"), remover todas as permissões de um
 * grupo daria acesso total a ele — o contrário exato do que quem configurou
 * quis dizer. Do jeito que está, grupo sem permissão num sistema configurado
 * não acessa nada, que é a leitura óbvia da tela.
 */
export async function sistemaSemPermissoes(): Promise<boolean> {
  const agora = Date.now();
  if (configuradoEm > agora - TTL_MS) return !configurado;

  const alguma = await prisma.grupoUsuarioPermissao.findFirst({ select: { grupoId: true } });
  configurado = alguma !== null;
  configuradoEm = agora;
  return !configurado;
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
  configuradoEm = 0;
}
