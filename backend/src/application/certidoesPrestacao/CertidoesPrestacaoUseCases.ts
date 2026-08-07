import type { ICertidoesPrestacaoRepository } from './ICertidoesPrestacaoRepository';
import type { IPrestacaoRepository } from '@/application/prestacao/IPrestacaoRepository';
import type { DadosGerais, DadosGeraisDTO, Responsaveis, ResponsaveisDTO } from './dtos';
import { NotFoundError } from '@/shared/errors';

const limpar = (v?: string | null): string | null => (v?.trim() ? v.trim() : null);

export class CertidoesPrestacaoUseCases {
  constructor(
    private readonly repo: ICertidoesPrestacaoRepository,
    private readonly prestacoes: IPrestacaoRepository,
  ) {}

  private async garantirPrestacao(prestacaoId: string) {
    if (!(await this.prestacoes.buscarPorId(prestacaoId)))
      throw new NotFoundError('Prestação não encontrada.');
  }

  async obterDadosGerais(prestacaoId: string): Promise<DadosGerais | null> {
    await this.garantirPrestacao(prestacaoId);
    return this.repo.obterDadosGerais(prestacaoId);
  }

  async salvarDadosGerais(prestacaoId: string, input: DadosGeraisDTO): Promise<DadosGerais> {
    await this.garantirPrestacao(prestacaoId);
    return this.repo.salvarDadosGerais(prestacaoId, {
      identCertidaoDadosGerais: limpar(input.identCertidaoDadosGerais),
      identCertidaoCorpoDiretivo: limpar(input.identCertidaoCorpoDiretivo),
      identCertidaoMembrosConselho: limpar(input.identCertidaoMembrosConselho),
      identCertidaoResponsaveis: limpar(input.identCertidaoResponsaveis),
    });
  }

  async obterResponsaveis(prestacaoId: string): Promise<Responsaveis | null> {
    await this.garantirPrestacao(prestacaoId);
    return this.repo.obterResponsaveis(prestacaoId);
  }

  async salvarResponsaveis(prestacaoId: string, input: ResponsaveisDTO): Promise<Responsaveis> {
    await this.garantirPrestacao(prestacaoId);
    return this.repo.salvarResponsaveis(prestacaoId, {
      identCertidaoResponsaveis: limpar(input.identCertidaoResponsaveis),
      identCertidaoComissaoAvaliacao: limpar(input.identCertidaoComissaoAvaliacao),
      identCertidaoControleInterno: limpar(input.identCertidaoControleInterno),
      identCertidaoFiscalizacaoExecucao: limpar(input.identCertidaoFiscalizacaoExecucao),
    });
  }
}
