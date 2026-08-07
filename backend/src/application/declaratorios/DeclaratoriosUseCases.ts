import type { IDeclaratoriosRepository } from './IDeclaratoriosRepository';
import type { IPrestacaoRepository } from '@/application/prestacao/IPrestacaoRepository';
import type {
  Declaracoes,
  DeclaracoesDTO,
  Demonstracoes,
  DemonstracoesDTO,
  Extrato,
  ExtratoDTO,
  Parecer,
  ParecerDTO,
  PrestacaoEntidade,
  PrestacaoEntidadeDTO,
  Publicacao,
  PublicacaoParecerAta,
  PublicacaoParecerAtaDTO,
  PublicacaoRelAtividades,
  PublicacaoRelAtividadesDTO,
  RegulamentoCompras,
  RegulamentoComprasDTO,
  RelatorioFinal,
  RelatorioFinalDTO,
  RequisitoAtende,
  TermoBens,
  TermoBensDTO,
  Transparencia,
  TransparenciaDTO,
} from './dtos';
import { NotFoundError } from '@/shared/errors';
import { apenasDigitos } from '@/shared/validators/documento';

const bool = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null);
const strOuNull = (v?: string | null): string | null => (v?.trim() ? v.trim() : null);
const dig = (v?: string | null): string | null => {
  const d = apenasDigitos(v ?? '');
  return d || null;
};
const num = (v: unknown): number | null => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));

function normReqs(lista: RequisitoAtende[] | undefined): RequisitoAtende[] {
  if (!Array.isArray(lista)) return [];
  return lista
    .map((r) => ({ requisito: Number(r?.requisito), atende: !!r?.atende }))
    .filter((r) => Number.isInteger(r.requisito));
}

function normPublicacoes(lista: Publicacao[] | undefined): Publicacao[] {
  if (!Array.isArray(lista)) return [];
  return lista
    .map((p) => ({
      tipoVeiculo: num(p?.tipoVeiculo),
      nomeVeiculo: strOuNull(p?.nomeVeiculo),
      dataPublicacao: strOuNull(p?.dataPublicacao),
      enderecoInternet: strOuNull(p?.enderecoInternet),
    }))
    .filter((p) => p.tipoVeiculo != null);
}

export class DeclaratoriosUseCases {
  constructor(
    private readonly repo: IDeclaratoriosRepository,
    private readonly prestacoes: IPrestacaoRepository,
  ) {}

  private async garantir(prestacaoId: string) {
    if (!(await this.prestacoes.buscarPorId(prestacaoId)))
      throw new NotFoundError('Prestação não encontrada.');
  }

  // ---- Declarações (24) ----
  async obterDeclaracoes(prestacaoId: string): Promise<Declaracoes | null> {
    await this.garantir(prestacaoId);
    return this.repo.obterDeclaracoes(prestacaoId);
  }

  async salvarDeclaracoes(prestacaoId: string, input: DeclaracoesDTO): Promise<Declaracoes> {
    await this.garantir(prestacaoId);
    return this.repo.salvarDeclaracoes(prestacaoId, {
      houveContratacao: bool(input.houveContratacao),
      empresasPertencentes: (input.empresasPertencentes ?? [])
        .map((e) => ({ cnpj: dig(e.cnpj), cpf: dig(e.cpf) }))
        .filter((e) => e.cnpj || e.cpf),
      houveParticipacao: bool(input.houveParticipacao),
      participacoes: (input.participacoes ?? [])
        .map((p) => ({
          cpfDirigente: dig(p.cpfDirigente),
          cpfsContratados: (p.cpfsContratados ?? []).map((c) => dig(c)).filter((c): c is string => !!c),
        }))
        .filter((p) => p.cpfDirigente || p.cpfsContratados.length),
      comprasAdequadas: bool(input.comprasAdequadas),
    });
  }

  // ---- Parecer Conclusivo (33) ----
  async obterParecer(prestacaoId: string): Promise<Parecer | null> {
    await this.garantir(prestacaoId);
    return this.repo.obterParecer(prestacaoId);
  }

  async salvarParecer(prestacaoId: string, input: ParecerDTO): Promise<Parecer> {
    await this.garantir(prestacaoId);
    return this.repo.salvarParecer(prestacaoId, {
      identificacaoParecer: strOuNull(input.identificacaoParecer),
      conclusaoParecer: num(input.conclusaoParecer),
      consideracoesParecer: strOuNull(input.consideracoesParecer),
      declaracoes: (input.declaracoes ?? [])
        .map((d) => ({
          tipoDeclaracao: Number(d.tipoDeclaracao),
          declaracao: num(d.declaracao),
          justificativa: strOuNull(d.justificativa),
        }))
        .filter((d) => Number.isInteger(d.tipoDeclaracao)),
    });
  }

  // ---- Transparência (34) ----
  async obterTransparencia(prestacaoId: string): Promise<Transparencia | null> {
    await this.garantir(prestacaoId);
    return this.repo.obterTransparencia(prestacaoId);
  }

  async salvarTransparencia(prestacaoId: string, input: TransparenciaDTO): Promise<Transparencia> {
    await this.garantir(prestacaoId);
    return this.repo.salvarTransparencia(prestacaoId, {
      mantemSitio: bool(input.mantemSitio),
      sitios: (input.sitios ?? []).map((s) => s?.trim()).filter((s): s is string => !!s),
      requisitos781: normReqs(input.requisitos781),
      requisitos83: normReqs(input.requisitos83),
      requisitosDivulgacao: normReqs(input.requisitosDivulgacao),
    });
  }

  // ---- Demonstrações Contábeis (28) ----
  async obterDemonstracoes(prestacaoId: string): Promise<Demonstracoes | null> {
    await this.garantir(prestacaoId);
    return this.repo.obterDemonstracoes(prestacaoId);
  }

  async salvarDemonstracoes(prestacaoId: string, input: DemonstracoesDTO): Promise<Demonstracoes> {
    await this.garantir(prestacaoId);
    return this.repo.salvarDemonstracoes(prestacaoId, {
      publicacoes: normPublicacoes(input.publicacoes),
      respNumeroCrc: strOuNull(input.respNumeroCrc),
      respCpf: dig(input.respCpf),
      respSituacaoRegular: bool(input.respSituacaoRegular),
    });
  }

  // ---- Publicações de Parecer ou Ata (29) ----
  async obterPublicacaoParecerAta(prestacaoId: string): Promise<PublicacaoParecerAta | null> {
    await this.garantir(prestacaoId);
    return this.repo.obterPublicacaoParecerAta(prestacaoId);
  }

  async salvarPublicacaoParecerAta(prestacaoId: string, input: PublicacaoParecerAtaDTO): Promise<PublicacaoParecerAta> {
    await this.garantir(prestacaoId);
    return this.repo.salvarPublicacaoParecerAta(prestacaoId, {
      itens: (input.itens ?? [])
        .map((it) => ({
          tipoParecerAta: Number(it.tipoParecerAta),
          houvePublicacao: bool(it.houvePublicacao),
          publicacoes: normPublicacoes(it.publicacoes),
          conclusaoParecer: num(it.conclusaoParecer),
        }))
        .filter((it) => Number.isInteger(it.tipoParecerAta)),
    });
  }

  // ---- Publicação do Relatório de Atividades (30) ----
  async obterPublicacaoRelAtividades(prestacaoId: string): Promise<PublicacaoRelAtividades | null> {
    await this.garantir(prestacaoId);
    return this.repo.obterPublicacaoRelAtividades(prestacaoId);
  }

  async salvarPublicacaoRelAtividades(prestacaoId: string, input: PublicacaoRelAtividadesDTO): Promise<PublicacaoRelAtividades> {
    await this.garantir(prestacaoId);
    return this.repo.salvarPublicacaoRelAtividades(prestacaoId, {
      houvePublicacaoExercicio: bool(input.houvePublicacaoExercicio),
      publicacoes: normPublicacoes(input.publicacoes),
    });
  }

  // ---- Prestação de Contas da Entidade (32) ----
  async obterPrestacaoEntidade(prestacaoId: string): Promise<PrestacaoEntidade | null> {
    await this.garantir(prestacaoId);
    return this.repo.obterPrestacaoEntidade(prestacaoId);
  }

  async salvarPrestacaoEntidade(prestacaoId: string, input: PrestacaoEntidadeDTO): Promise<PrestacaoEntidade> {
    await this.garantir(prestacaoId);
    return this.repo.salvarPrestacaoEntidade(prestacaoId, {
      dataPrestacao: strOuNull(input.dataPrestacao),
      periodoReferenciaInicial: strOuNull(input.periodoReferenciaInicial),
      periodoReferenciaFinal: strOuNull(input.periodoReferenciaFinal),
    });
  }

  // ---- Relatório Final (25/26/27) ----
  async obterRelatorioFinal(prestacaoId: string): Promise<RelatorioFinal | null> {
    await this.garantir(prestacaoId);
    return this.repo.obterRelatorioFinal(prestacaoId);
  }

  async salvarRelatorioFinal(prestacaoId: string, input: RelatorioFinalDTO): Promise<RelatorioFinal> {
    await this.garantir(prestacaoId);
    return this.repo.salvarRelatorioFinal(prestacaoId, {
      houveEmissao: bool(input.houveEmissao),
      conclusao: num(input.conclusao),
      justificativa: strOuNull(input.justificativa),
    });
  }

  // ---- Regulamento de Compras (22) ----
  async obterRegulamentoCompras(prestacaoId: string): Promise<RegulamentoCompras | null> {
    await this.garantir(prestacaoId);
    return this.repo.obterRegulamentoCompras(prestacaoId);
  }

  async salvarRegulamentoCompras(prestacaoId: string, input: RegulamentoComprasDTO): Promise<RegulamentoCompras> {
    await this.garantir(prestacaoId);
    return this.repo.salvarRegulamentoCompras(prestacaoId, {
      houvePublicacaoInicial: bool(input.houvePublicacaoInicial),
      publicacoesInicial: normPublicacoes(input.publicacoesInicial),
      houveAlteracao: bool(input.houveAlteracao),
      houvePublicacaoAlterado: bool(input.houvePublicacaoAlterado),
      publicacoesAlteracao: normPublicacoes(input.publicacoesAlteracao),
    });
  }

  // ---- Extrato Físico-Financeiro (23) ----
  async obterExtrato(prestacaoId: string): Promise<Extrato | null> {
    await this.garantir(prestacaoId);
    return this.repo.obterExtrato(prestacaoId);
  }

  async salvarExtrato(prestacaoId: string, input: ExtratoDTO): Promise<Extrato> {
    await this.garantir(prestacaoId);
    return this.repo.salvarExtrato(prestacaoId, {
      haExtrato: bool(input.haExtrato),
      extratoConformeModelo: bool(input.extratoConformeModelo),
      publicacoes: normPublicacoes(input.publicacoes),
    });
  }

  // ---- Termo de Bens Cedidos (31) ----
  async obterTermoBens(prestacaoId: string): Promise<TermoBens | null> {
    await this.garantir(prestacaoId);
    return this.repo.obterTermoBens(prestacaoId);
  }

  async salvarTermoBens(prestacaoId: string, input: TermoBensDTO): Promise<TermoBens> {
    await this.garantir(prestacaoId);
    return this.repo.salvarTermoBens(prestacaoId, { termoCessaoPermissao: bool(input.termoCessaoPermissao) });
  }
}
