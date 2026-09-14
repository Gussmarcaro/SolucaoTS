import type { Request, Response, NextFunction } from 'express';
import { GuiaRecolhimentoUseCases } from '@/application/guiaRecolhimento/GuiaRecolhimentoUseCases';
import { PrismaGuiaRecolhimentoRepository } from '@/infrastructure/database/PrismaGuiaRecolhimentoRepository';

const casos = new GuiaRecolhimentoUseCases(new PrismaGuiaRecolhimentoRepository());

export class GuiaRecolhimentoController {
  /** `GET /guias-recolhimento` — o apurado por competência, com a guia ao lado. */
  async apurar(req: Request, res: Response, next: NextFunction) {
    try {
      const ano = req.query.ano ? Number(req.query.ano) : undefined;
      const mes = req.query.mes ? Number(req.query.mes) : undefined;
      return res.json(await casos.apurar({ ano, mes }));
    } catch (e) {
      return next(e);
    }
  }

  async criar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(201).json(await casos.criar(req.body));
    } catch (e) {
      return next(e);
    }
  }

  async atualizar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.atualizar(req.params.id, req.body));
    } catch (e) {
      return next(e);
    }
  }

  async excluir(req: Request, res: Response, next: NextFunction) {
    try {
      await casos.excluir(req.params.id);
      return res.status(204).end();
    } catch (e) {
      return next(e);
    }
  }
}
