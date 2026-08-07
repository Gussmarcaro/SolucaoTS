import type { Request, Response, NextFunction } from 'express';
import { CertidoesPrestacaoUseCases } from '@/application/certidoesPrestacao/CertidoesPrestacaoUseCases';
import { PrismaCertidoesPrestacaoRepository } from '@/infrastructure/database/PrismaCertidoesPrestacaoRepository';
import { PrismaPrestacaoRepository } from '@/infrastructure/database/PrismaPrestacaoRepository';

const casos = new CertidoesPrestacaoUseCases(
  new PrismaCertidoesPrestacaoRepository(),
  new PrismaPrestacaoRepository(),
);

export class CertidoesPrestacaoController {
  async obterDadosGerais(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.obterDadosGerais(req.params.prestacaoId));
    } catch (e) {
      return next(e);
    }
  }

  async salvarDadosGerais(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.salvarDadosGerais(req.params.prestacaoId, req.body));
    } catch (e) {
      return next(e);
    }
  }

  async obterResponsaveis(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.obterResponsaveis(req.params.prestacaoId));
    } catch (e) {
      return next(e);
    }
  }

  async salvarResponsaveis(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.salvarResponsaveis(req.params.prestacaoId, req.body));
    } catch (e) {
      return next(e);
    }
  }
}
