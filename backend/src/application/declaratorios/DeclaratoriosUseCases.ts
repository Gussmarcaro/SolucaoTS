import type { IDeclaratoriosRepository } from './IDeclaratoriosRepository';
import type { IPrestacaoRepository } from '@/application/prestacao/IPrestacaoRepository';
import type {
  Declaracoes,
  DeclaracoesDTO,
  Parecer,
  ParecerDTO,
  RequisitoAtende,
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
}
