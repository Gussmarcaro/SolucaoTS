import type { Request, Response, NextFunction } from 'express';
import { DocumentoFiscalUseCases } from '@/application/documentoFiscal/DocumentoFiscalUseCases';
import { PrismaDocumentoFiscalRepository } from '@/infrastructure/database/PrismaDocumentoFiscalRepository';
import { PrismaPrestacaoRepository } from '@/infrastructure/database/PrismaPrestacaoRepository';
import { PrismaRateioRepository } from '@/infrastructure/database/PrismaRateioRepository';
import { PrismaPlanoAplicacaoRepository } from '@/infrastructure/database/PrismaPlanoAplicacaoRepository';
import { PrismaContratoRepository } from '@/infrastructure/database/PrismaContratoRepository';

const casos = new DocumentoFiscalUseCases(
  new PrismaDocumentoFiscalRepository(),
  new PrismaPrestacaoRepository(),
  new PrismaRateioRepository(),
  new PrismaPlanoAplicacaoRepository(),
  new PrismaContratoRepository(),
);

export class DocumentoFiscalController {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.listar(req.params.prestacaoId));
    } catch (e) {
      return next(e);
    }
  }


  /** `GET /prestacoes/:prestacaoId/documentos-fiscais/apropriados` */
  async listarApropriados(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.listarApropriados(req.params.prestacaoId));
    } catch (e) {
      return next(e);
    }
  }

  /** `GET /prestacoes/:prestacaoId/documentos-fiscais/candidatos` */
  async listarCandidatos(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.listarCandidatos(req.params.prestacaoId));
    } catch (e) {
      return next(e);
    }
  }

  /** `POST /prestacoes/:prestacaoId/documentos-fiscais/:id/apropriar` */
  async apropriar(req: Request, res: Response, next: NextFunction) {
    try {
      await casos.apropriar(req.params.prestacaoId, req.params.id, req.body?.contratoId);
      return res.status(204).end();
    } catch (e) {
      return next(e);
    }
  }

  /** `DELETE /prestacoes/:prestacaoId/documentos-fiscais/:id/apropriar` */
  async desapropriar(req: Request, res: Response, next: NextFunction) {
    try {
      await casos.desapropriar(req.params.prestacaoId, req.params.id);
      return res.status(204).end();
    } catch (e) {
      return next(e);
    }
  }
}
