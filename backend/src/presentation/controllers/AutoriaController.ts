import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '@/infrastructure/database/prisma';
import { NotFoundError } from '@/shared/errors';
import { paraDataISO } from '@/shared/datas';

/**
 * Models que podem ser consultados aqui — os que têm `criadoPor`.
 *
 * Derivado do schema, e não uma lista à mão, pelo mesmo motivo da extension de
 * auditoria: cadastro novo passa a funcionar sozinho. Serve também de trava —
 * o nome vindo da URL é usado para acessar o client do Prisma, então precisa
 * ser validado contra este conjunto antes de qualquer coisa.
 */
const MODELS = new Map(
  Prisma.dmmf.datamodel.models
    .filter((m) => m.fields.some((f) => f.name === 'criadoPor'))
    .map((m) => [m.name, m.name[0].toLowerCase() + m.name.slice(1)] as const),
);

type ClientePrisma = Record<string, { findUnique: (args: unknown) => Promise<unknown> }>;

export class AutoriaController {
  /**
   * `GET /autoria/:entidade/:id` — quem incluiu o registro e quando.
   *
   * Uma rota só para os 40 cadastros, em vez do campo atravessando entidade,
   * DTO e tela de cada um: a informação é a mesma em todos, e é lida sob
   * demanda ao abrir a visualização, não em toda listagem.
   */
  async consultar(req: Request, res: Response, next: NextFunction) {
    try {
      const delegate = MODELS.get(req.params.entidade);
      if (!delegate) throw new NotFoundError('Cadastro não reconhecido.');

      const registro = (await (prisma as unknown as ClientePrisma)[delegate].findUnique({
        where: { id: req.params.id },
        select: { criadoPor: true, criadoEm: true },
      })) as { criadoPor: string | null; criadoEm?: Date } | null;

      if (!registro) throw new NotFoundError('Registro não encontrado.');

      // `criadoPor` guarda o id; quem lê a tela quer o nome. Registros
      // anteriores à auditoria têm o campo nulo — e "—" é a resposta honesta,
      // melhor que atribuir a inclusão a alguém.
      const autor = registro.criadoPor
        ? await prisma.usuario.findUnique({
            where: { id: registro.criadoPor },
            select: { nome: true },
          })
        : null;

      return res.json({
        criadoPorNome: autor?.nome ?? null,
        criadoEm: registro.criadoEm ? paraDataISO(registro.criadoEm) : null,
      });
    } catch (e) {
      return next(e);
    }
  }
}
