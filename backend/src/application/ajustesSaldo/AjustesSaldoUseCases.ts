import type { IAjustesSaldoRepository } from './IAjustesSaldoRepository';
import type { IPrestacaoRepository } from '@/application/prestacao/IPrestacaoRepository';
import type { AjustesSaldo, AjustesSaldoDTO } from './dtos';
import { NotFoundError } from '@/shared/errors';

const s = (v?: string | null): string | null => (v?.trim() ? v.trim() : null);
const n = (v: unknown): number | null => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));
/** Mantém itens com algum conteúdo relevante. */
const cheio = (obj: Record<string, unknown>) => Object.values(obj).some((v) => v != null && v !== '');

export class AjustesSaldoUseCases {
  constructor(
    private readonly repo: IAjustesSaldoRepository,
    private readonly prestacoes: IPrestacaoRepository,
  ) {}

  private async garantir(prestacaoId: string) {
    if (!(await this.prestacoes.buscarPorId(prestacaoId)))
      throw new NotFoundError('Prestação não encontrada.');
  }

  async obter(prestacaoId: string): Promise<AjustesSaldo | null> {
    await this.garantir(prestacaoId);
    return this.repo.obter(prestacaoId);
  }

  async salvar(prestacaoId: string, input: AjustesSaldoDTO): Promise<AjustesSaldo> {
    await this.garantir(prestacaoId);
    return this.repo.salvar(prestacaoId, {
      retificacaoRepasses: (input.retificacaoRepasses ?? [])
        .map((r) => ({ dataPrevista: s(r.dataPrevista), dataRepasse: s(r.dataRepasse), fonteRecursoTipo: n(r.fonteRecursoTipo), valorRetificado: n(r.valorRetificado) }))
        .filter(cheio),
      inclusaoRepasses: (input.inclusaoRepasses ?? [])
        .map((r) => ({ dataPrevista: s(r.dataPrevista), dataRepasse: s(r.dataRepasse), valor: n(r.valor), fonteRecursoTipo: n(r.fonteRecursoTipo) }))
        .filter(cheio),
      retificacaoPagamentos: (input.retificacaoPagamentos ?? [])
        .map((p) => ({
          docNumero: s(p.docNumero),
          docCredorTipo: n(p.docCredorTipo),
          docCredorNumero: s(p.docCredorNumero),
          pagamentoData: s(p.pagamentoData),
          pagamentoValor: n(p.pagamentoValor),
          fonteRecursoTipo: n(p.fonteRecursoTipo),
          valorRetificado: n(p.valorRetificado),
        }))
        .filter(cheio),
      inclusaoPagamentos: (input.inclusaoPagamentos ?? [])
        .map((p) => ({
          docNumero: s(p.docNumero),
          docCredorTipo: n(p.docCredorTipo),
          docCredorNumero: s(p.docCredorNumero),
          pagamentoData: s(p.pagamentoData),
          pagamentoValor: n(p.pagamentoValor),
          fonteRecursoTipo: n(p.fonteRecursoTipo),
          meioPagamento: n(p.meioPagamento),
          banco: n(p.banco),
          agencia: n(p.agencia),
          contaCorrente: s(p.contaCorrente),
          numeroTransacao: s(p.numeroTransacao),
        }))
        .filter(cheio),
    });
  }
}
