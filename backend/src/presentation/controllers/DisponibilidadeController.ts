import type { Request, Response, NextFunction } from 'express';
import { DisponibilidadeUseCases } from '@/application/disponibilidade/DisponibilidadeUseCases';
import { PrismaDisponibilidadeRepository } from '@/infrastructure/database/PrismaDisponibilidadeRepository';
import { PrismaPrestacaoRepository } from '@/infrastructure/database/PrismaPrestacaoRepository';

const casos = new DisponibilidadeUseCases(
  new PrismaDisponibilidadeRepository(),
  new PrismaPrestacaoRepository(),
);

export class DisponibilidadeController {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.listar(req.params.prestacaoId));
    } catch (e) {
      return next(e);
    }
  }

  async criar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(201).json(await casos.criar(req.params.prestacaoId, req.body));
    } catch (e) {
      return next(e);
    }
  }

  async atualizar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.atualizar(req.params.prestacaoId, req.params.id, req.body));
    } catch (e) {
      return next(e);
    }
  }

  async excluir(req: Request, res: Response, next: NextFunction) {
    try {
      await casos.excluir(req.params.prestacaoId, req.params.id);
      return res.status(204).send();
    } catch (e) {
      return next(e);
    }
  }

  async obterSaldoFundoFixo(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json({ saldoFundoFixo: await casos.obterSaldoFundoFixo(req.params.prestacaoId) });
    } catch (e) {
      return next(e);
    }
  }

  async definirSaldoFundoFixo(req: Request, res: Response, next: NextFunction) {
    try {
      const valor = await casos.definirSaldoFundoFixo(req.params.prestacaoId, req.body?.saldoFundoFixo);
      return res.json({ saldoFundoFixo: valor });
    } catch (e) {
      return next(e);
    }
  }
}
