import type { Request, Response, NextFunction } from 'express';
import { DeclaratoriosUseCases } from '@/application/declaratorios/DeclaratoriosUseCases';
import { PrismaDeclaratoriosRepository } from '@/infrastructure/database/PrismaDeclaratoriosRepository';
import { PrismaPrestacaoRepository } from '@/infrastructure/database/PrismaPrestacaoRepository';
import type {
  DeclaracoesDTO,
  DemonstracoesDTO,
  ExtratoDTO,
  ParecerDTO,
  PrestacaoEntidadeDTO,
  PublicacaoParecerAtaDTO,
  PublicacaoRelAtividadesDTO,
  RegulamentoComprasDTO,
  RelatorioFinalDTO,
  TermoBensDTO,
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
  obterRelatorioFinal = wrap((id) => casos.obterRelatorioFinal(id));
  salvarRelatorioFinal = wrap<RelatorioFinalDTO>((id, body) => casos.salvarRelatorioFinal(id, body));
  obterRegulamentoCompras = wrap((id) => casos.obterRegulamentoCompras(id));
  salvarRegulamentoCompras = wrap<RegulamentoComprasDTO>((id, body) => casos.salvarRegulamentoCompras(id, body));
  obterExtrato = wrap((id) => casos.obterExtrato(id));
  salvarExtrato = wrap<ExtratoDTO>((id, body) => casos.salvarExtrato(id, body));
  obterTermoBens = wrap((id) => casos.obterTermoBens(id));
  salvarTermoBens = wrap<TermoBensDTO>((id, body) => casos.salvarTermoBens(id, body));
}
