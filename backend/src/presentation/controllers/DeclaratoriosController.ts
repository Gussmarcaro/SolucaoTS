import type { Request, Response, NextFunction } from 'express';
import { DeclaratoriosUseCases } from '@/application/declaratorios/DeclaratoriosUseCases';
import { PrismaDeclaratoriosRepository } from '@/infrastructure/database/PrismaDeclaratoriosRepository';
import { PrismaPrestacaoRepository } from '@/infrastructure/database/PrismaPrestacaoRepository';
import type {
  DeclaracoesDTO,
  DemonstracoesDTO,
  ParecerDTO,
  PrestacaoEntidadeDTO,
  PublicacaoParecerAtaDTO,
  PublicacaoRelAtividadesDTO,
  TransparenciaDTO,
} from '@/application/declaratorios/dtos';

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
  obterDemonstracoes = wrap((id) => casos.obterDemonstracoes(id));
  salvarDemonstracoes = wrap<DemonstracoesDTO>((id, body) => casos.salvarDemonstracoes(id, body));
  obterPublicacaoParecerAta = wrap((id) => casos.obterPublicacaoParecerAta(id));
  salvarPublicacaoParecerAta = wrap<PublicacaoParecerAtaDTO>((id, body) => casos.salvarPublicacaoParecerAta(id, body));
  obterPublicacaoRelAtividades = wrap((id) => casos.obterPublicacaoRelAtividades(id));
  salvarPublicacaoRelAtividades = wrap<PublicacaoRelAtividadesDTO>((id, body) => casos.salvarPublicacaoRelAtividades(id, body));
  obterPrestacaoEntidade = wrap((id) => casos.obterPrestacaoEntidade(id));
  salvarPrestacaoEntidade = wrap<PrestacaoEntidadeDTO>((id, body) => casos.salvarPrestacaoEntidade(id, body));
}
