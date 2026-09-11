import type { Request, Response, NextFunction } from 'express';
import { PlanoAplicacaoUseCases } from '@/application/planoAplicacao/PlanoAplicacaoUseCases';
import { PrismaPlanoAplicacaoRepository } from '@/infrastructure/database/PrismaPlanoAplicacaoRepository';
import { PrismaAjusteRepository } from '@/infrastructure/database/PrismaAjusteRepository';
import { BusinessError } from '@/shared/errors';
import { PLANO_PADRAO } from '@/core/planoAplicacao/planoPadrao';

const casos = new PlanoAplicacaoUseCases(
  new PrismaPlanoAplicacaoRepository(),
  new PrismaAjusteRepository(),
);

export class PlanoAplicacaoController {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.listar(req.params.ajusteId));
    } catch (e) {
      return next(e);
    }
  }

  async importar(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new BusinessError('Envie um arquivo .csv no campo "file".');
      const texto = req.file.buffer.toString('latin1');
      return res.json(await casos.importar(req.params.ajusteId, texto));
    } catch (e) {
      return next(e);
    }
  }

  async limpar(req: Request, res: Response, next: NextFunction) {
    try {
      await casos.limpar(req.params.ajusteId);
      return res.status(204).send();
    } catch (e) {
      return next(e);
    }
  }

  /** `PUT /ajustes/:ajusteId/plano-aplicacao` — o plano digitado na tela. */
  async salvarDigitado(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.salvarDigitado(req.params.ajusteId, req.body));
    } catch (e) {
      return next(e);
    }
  }

  /** `GET /ajustes/plano-aplicacao/padrao` — a estrutura-modelo para a tela. */
  async padrao(_req: Request, res: Response) {
    return res.json(PLANO_PADRAO);
  }
}
