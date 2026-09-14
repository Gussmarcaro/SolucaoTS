import type { Request, Response, NextFunction } from 'express';
import { ContaBancariaUseCases } from '@/application/contaBancaria/ContaBancariaUseCases';
import { PrismaContaBancariaRepository } from '@/infrastructure/database/PrismaContaBancariaRepository';
import { BusinessError } from '@/shared/errors';

const casos = new ContaBancariaUseCases(new PrismaContaBancariaRepository());

export class ContaBancariaController {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      // `?ativas=true` é o que o combo do Ajuste pede: conta inativa não deve
      // ser oferecida para uso novo, mas continua visível no cadastro.
      return res.json(await casos.listar(req.query.ativas === 'true'));
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

  async definirAtivo(req: Request, res: Response, next: NextFunction) {
    try {
      const ativo = req.body?.ativo;
      if (typeof ativo !== 'boolean') throw new BusinessError('Informe o campo "ativo" (true/false).');
      return res.json(await casos.definirAtivo(req.params.id, ativo));
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
