import { Prisma, type PrismaClient } from '@prisma/client';
import { contextoAtual } from '@/shared/contexto';

/**
 * Models que guardam quem incluiu o registro no campo `criadoPor`.
 *
 * Lido do schema, não escrito à mão. A lista fixa que existia aqui já estava
 * desatualizada — quatro models tinham a coluna e não constavam dela, então o
 * campo nunca era preenchido neles e a inclusão ainda ia para a trilha. Um
 * cadastro novo com o campo passa a ser reconhecido sozinho.
 *
 * Nenhum model gera linha de trilha por inclusão: a autoria fica no registro,
 * e a trilha cobre alteração, exclusão e consulta a dados pessoais.
 */
export const MODELS_COM_CRIADO_POR = new Set(
  Prisma.dmmf.datamodel.models
    .filter((m) => m.fields.some((f) => f.name === 'criadoPor'))
    .map((m) => m.name),
);

/**
 * Fora da trilha: tabelas de domínio (carga de seed — gerariam ~4.500 linhas a
 * cada recarga) e a própria auditoria, que é append-only e não pode se auditar
 * sob pena de laço infinito.
 */
export const NAO_AUDITAR = new Set([
  'Cbo',
  'ClassificacaoEconomica',
  'ComponenteDespesa',
  'RegistroAuditoria',
]);

/**
 * Campos que nunca entram no log: segredos (não podem vazar nem para o
 * auditor) e derivados que mudam a cada gravação, que só poluiriam o diff.
 */
const CAMPOS_OMITIDOS = new Set([
  'senhaHash',
  'resetTokenHash',
  'resetTokenExpiresAt',
  'buscaTexto',
  'atualizadoEm',
  // Conteúdo binário de PDF anexado: logá-lo gravaria megabytes por evento na
  // trilha. O nome e o tamanho do arquivo continuam sendo auditados.
  'estatutoArquivo',
  'termoCienciaArquivo',
  'ataArquivo',
  'arquivo',
]);

/**
 * Cliente sem extensions, usado para ler o estado anterior e gravar a trilha.
 * É injetado por `prisma.ts` depois de criar o client — evita import circular
 * e impede que a própria gravação da auditoria passe pela extension.
 */
let cliente: PrismaClient | null = null;

export function definirClienteAuditoria(c: PrismaClient): void {
  cliente = c;
}

type Registro = Record<string, unknown>;

export function limpar(dados: Registro | null | undefined): Registro {
  if (!dados) return {};
  const out: Registro = {};
  for (const [k, v] of Object.entries(dados)) {
    if (!CAMPOS_OMITIDOS.has(k)) out[k] = v instanceof Date ? v.toISOString() : v;
  }
  return out;
}

/** Exportada para `verificar:auditoria`. Campos que mudaram, como `{ campo: { de, para } }`. Vazio = nada mudou. */
export function diferenca(antes: Registro, depois: Registro): Registro {
  const mudou: Registro = {};
  for (const [campo, valorDepois] of Object.entries(depois)) {
    const valorAntes = antes[campo];
    // Comparação por JSON resolve Decimal, Date e Json sem caso especial.
    if (JSON.stringify(valorAntes) !== JSON.stringify(valorDepois)) {
      mudou[campo] = { de: valorAntes ?? null, para: valorDepois ?? null };
    }
  }
  return mudou;
}

// `CRIACAO` continua no enum e nos filtros: as linhas gravadas antes desta
// mudança seguem no banco e precisam ser consultáveis. O que sai é a gravação.
// Ações que esta extension grava. `VISUALIZACAO` vem de outro caminho (o
// registro de acesso a dados pessoais), e `CRIACAO` deixou de ser gravada —
// mas segue no enum e nos filtros, porque as linhas antigas continuam no banco.
type Acao = 'ALTERACAO' | 'EXCLUSAO' | 'INATIVACAO' | 'REATIVACAO';

/**
 * Grava uma linha da trilha. Nunca lança: uma falha aqui não pode derrubar a
 * operação de negócio que já foi concluída — o erro vai para o log do servidor.
 */
async function registrar(params: {
  entidade: string;
  registroId: string;
  acao: Acao;
  alteracoes?: Registro;
  registroDescricao?: string | null;
}): Promise<void> {
  const ctx = contextoAtual();
  try {
    await cliente?.registroAuditoria.create({
      data: {
        usuarioId: ctx?.usuarioId ?? null,
        usuarioNome: ctx?.usuarioNome ?? '(sistema)',
        entidade: params.entidade,
        registroId: params.registroId,
        registroDescricao: params.registroDescricao ?? null,
        acao: params.acao,
        alteracoes: (params.alteracoes ?? {}) as Prisma.InputJsonValue,
        rota: ctx?.rota ?? null,
      },
    });
  } catch (err) {
    console.error('[auditoria] falha ao registrar (não crítico):', err);
  }
}

/**
 * Campos binários grandes. `estadoAnterior` lê o registro inteiro para montar o
 * diff, e sem isto uma edição de entidade traria o PDF do estatuto (até 5 MB) do
 * banco só para descartá-lo em `limpar()`.
 */
const CAMPOS_PESADOS = new Set([
  'estatutoArquivo',
  'termoCienciaArquivo',
  'ataArquivo',
  'arquivo',
]);

/** Cache do select por model: `undefined` = pode ler tudo. */
const selecaoLeveCache = new Map<string, Record<string, boolean> | undefined>();

function selecaoLeve(model: string): Record<string, boolean> | undefined {
  if (selecaoLeveCache.has(model)) return selecaoLeveCache.get(model);
  const meta = Prisma.dmmf.datamodel.models.find((m) => m.name === model);
  const temPesado = meta?.fields.some((f) => CAMPOS_PESADOS.has(f.name)) ?? false;
  const select = temPesado
    ? Object.fromEntries(
        meta!.fields
          .filter((f) => f.kind === 'scalar' && !CAMPOS_PESADOS.has(f.name))
          .map((f) => [f.name, true]),
      )
    : undefined;
  selecaoLeveCache.set(model, select);
  return select;
}

/** Lê o registro antes da operação, para compor o diff / o snapshot. */
async function estadoAnterior(model: string, where: unknown): Promise<Registro | null> {
  try {
    const delegate = (cliente as unknown as Record<string, { findFirst: (a: unknown) => Promise<Registro | null> }>)[
      model.charAt(0).toLowerCase() + model.slice(1)
    ];
    const select = selecaoLeve(model);
    return (await delegate?.findFirst(select ? { where, select } : { where })) ?? null;
  } catch {
    return null;
  }
}

const idDe = (r: unknown): string => String((r as Registro | null)?.id ?? '(desconhecido)');

/**
 * Campos que servem de rótulo, em ordem de preferência. O primeiro preenchido
 * vence — cobre a maioria dos models sem caso especial.
 */
const CAMPOS_DESCRITIVOS = [
  'razaoSocial',
  'nome',
  'nomePrograma',
  'titulo',
  'descricao',
  'codigoAjuste',
  'codigoMeta',
  'numero',
  'conta',
  'cpf',
];

/** Models cujo rótulo fica melhor com um prefixo. */
const PREFIXO: Record<string, string> = {
  ContratoFirmado: 'Contrato nº ',
  Contrato: 'Contrato nº ',
  DocumentoFiscal: 'Doc. fiscal nº ',
  EmpenhoCadastro: 'Empenho nº ',
  EmpenhoPrestacao: 'Empenho nº ',
  TermoAditivo: 'Termo aditivo nº ',
};

/**
 * Descrição legível do registro, guardada junto do log.
 *
 * Sem isso a trilha diz "alteraram um Fornecedor" sem dizer qual — e depois de
 * uma exclusão não há mais como descobrir, porque o registro deixou de existir.
 */
export function descrever(model: string, registro: Registro | null): string | null {
  if (!registro) return null;
  for (const campo of CAMPOS_DESCRITIVOS) {
    const valor = registro[campo];
    if (valor != null && String(valor).trim() !== '') {
      return `${PREFIXO[model] ?? ''}${String(valor)}`.slice(0, 200);
    }
  }
  return null;
}

/**
 * Extension do Prisma Client: preenche `criadoPor` e mantém a trilha de
 * auditoria.
 *
 * Fica na camada de dados de propósito — vale para qualquer caminho que grave,
 * inclusive código futuro, sem depender de alguém lembrar de chamar o log.
 * Fora de uma requisição (seeds, scripts, startup) o contexto não existe: o
 * `criadoPor` fica nulo e a autoria vira "(sistema)".
 */
export const extensaoAuditoria = Prisma.defineExtension({
  name: 'auditoria',
  query: {
    $allModels: {
      /**
       * Inclusão **não** entra na trilha.
       *
       * A extension continua interceptando a criação por um motivo: preencher
       * `criadoPor` nos cadastros que têm o campo. É lá que a autoria da
       * inclusão é consultada na prática ("quem cadastrou este fornecedor?"),
       * sem custar uma linha de log por registro criado.
       *
       * Consequência conhecida: os blocos da prestação não têm `criadoPor`, e
       * portanto passam a não registrar quem os incluiu — a trilha deles cobre
       * alteração e exclusão. Se essa autoria fizer falta, o caminho é
       * acrescentar `criadoPor` a esses models, não devolver o log.
       */
      async create({ model, args, query }) {
        const ctx = contextoAtual();
        const dados = args.data as Registro;
        if (ctx && MODELS_COM_CRIADO_POR.has(model)) dados.criadoPor ??= ctx.usuarioId;
        return query(args);
      },

      async update({ model, args, query }) {
        if (NAO_AUDITAR.has(model)) return query(args);

        const antes = limpar(await estadoAnterior(model, args.where));
        const resultado = await query(args);
        const mudou = diferenca(antes, limpar(resultado as Registro));

        if (Object.keys(mudou).length > 0) {
          // Soft delete é um update, mas o usuário lê como exclusão.
          const ativo = mudou.ativo as { de: unknown; para: unknown } | undefined;
          const acao: Acao = ativo ? (ativo.para === false ? 'INATIVACAO' : 'REATIVACAO') : 'ALTERACAO';
          await registrar({
            entidade: model,
            registroId: idDe(resultado),
            registroDescricao: descrever(model, resultado as Registro),
            acao,
            alteracoes: mudou,
          });
        }
        return resultado;
      },

      async delete({ model, args, query }) {
        if (NAO_AUDITAR.has(model)) return query(args);

        // Snapshot completo: é a última chance de saber o que havia ali.
        const antes = limpar(await estadoAnterior(model, args.where));
        const resultado = await query(args);
        await registrar({
          entidade: model,
          registroId: idDe(resultado),
          // Da foto anterior: o registro já não existe para ser consultado.
          registroDescricao: descrever(model, antes),
          acao: 'EXCLUSAO',
          alteracoes: antes,
        });
        return resultado;
      },

      // Operações em lote (ex.: a reimportação de CSV apaga e recria tudo)
      // viram UMA linha com a quantidade, em vez de centenas.
      async deleteMany({ model, args, query }) {
        if (NAO_AUDITAR.has(model)) return query(args);
        const resultado = (await query(args)) as { count: number };
        if (resultado.count > 0) {
          await registrar({
            entidade: model,
            registroId: '(vários)',
            acao: 'EXCLUSAO',
            alteracoes: { quantidade: resultado.count, filtro: args.where ?? null },
          });
        }
        return resultado;
      },

      async updateMany({ model, args, query }) {
        if (NAO_AUDITAR.has(model)) return query(args);
        const resultado = (await query(args)) as { count: number };
        if (resultado.count > 0) {
          await registrar({
            entidade: model,
            registroId: '(vários)',
            acao: 'ALTERACAO',
            alteracoes: { quantidade: resultado.count, filtro: args.where ?? null, dados: limpar(args.data as Registro) },
          });
        }
        return resultado;
      },

      /** Mesma regra do `create`: só preenche `criadoPor`, não registra. */
      async createMany({ model, args, query }) {
        const ctx = contextoAtual();
        if (ctx && MODELS_COM_CRIADO_POR.has(model) && Array.isArray(args.data)) {
          for (const d of args.data as Registro[]) d.criadoPor ??= ctx.usuarioId;
        }
        return query(args);
      },
    },
  },
});
