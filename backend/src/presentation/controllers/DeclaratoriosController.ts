import type { Request, Response, NextFunction } from 'express';
import { DeclaratoriosUseCases } from '@/application/declaratorios/DeclaratoriosUseCases';
import { PrismaDeclaratoriosRepository } from '@/infrastructure/database/PrismaDeclaratoriosRepository';
import { PrismaPrestacaoRepository } from '@/infrastructure/database/PrismaPrestacaoRepository';
import type { DeclaracoesDTO, ParecerDTO, TransparenciaDTO } from '@/application/declaratorios/dtos';

const casos = new DeclaratoriosUseCases(
  new PrismaDeclaratoriosRepository(),
  new PrismaPrestacaoRepository(),
);

const wrap =
  <B>(fn: (id: string, body: B) => Promise<unknown>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      return res.json(await fn(req.params.prestacaoId, (req.body ?? {}) as B));
    } catch (e) {
      return next(e);
    }
  };

export class DeclaratoriosController {
  obterDeclaracoes = wrap((id) => casos.obterDeclaracoes(id));
  salvarDeclaracoes = wrap<DeclaracoesDTO>((id, body) => casos.salvarDeclaracoes(id, body));
  obterParecer = wrap((id) => casos.obterParecer(id));
  salvarParecer = wrap<ParecerDTO>((id, body) => casos.salvarParecer(id, body));
  obterTransparencia = wrap((id) => casos.obterTransparencia(id));
  salvarTransparencia = wrap<TransparenciaDTO>((id, body) => casos.salvarTransparencia(id, body));
}
