import type { Request, Response, NextFunction } from 'express';
import { ConsultarAuditoriaUseCase } from '@/application/auditoria/ConsultarAuditoriaUseCase';
import { PrismaAuditoriaRepository } from '@/infrastructure/database/PrismaAuditoriaRepository';

const casos = new ConsultarAuditoriaUseCase(new PrismaAuditoriaRepository());

const texto = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

export class AuditoriaController {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const q = req.query;
      return res.json(
        await casos.listar({
          entidade: texto(q.entidade),
          registroId: texto(q.registroId),
          usuarioId: texto(q.usuarioId),
          acao: texto(q.acao),
          de: texto(q.de),
          ate: texto(q.ate),
          page: q.page ? Number(q.page) : undefined,
          pageSize: q.pageSize ? Number(q.pageSize) : undefined,
        }),
      );
    } catch (e) {
      return next(e);
    }
  }

  async historico(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.historico(req.params.entidade, req.params.registroId));
    } catch (e) {
      return next(e);
    }
  }

  async entidades(_req: Request, res: Response, next: NextFunction) {
    try {
      return res.json({ itens: await casos.entidades() });
    } catch (e) {
      return next(e);
    }
  }
}
