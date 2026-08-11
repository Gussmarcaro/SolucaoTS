import type { EntidadeBeneficiaria } from '@/core/entidade/EntidadeBeneficiaria';
import type { IEntidadeRepository } from './IEntidadeRepository';
import type { AtualizarEntidadeDTO } from './dtos';
import { ConflictError, NotFoundError } from '@/shared/errors';
import { normalizarEValidarEntidade } from './validarEntidade';

export class AtualizarEntidadeUseCase {
  constructor(private readonly repo: IEntidadeRepository) {}

  async execute(id: string, input: AtualizarEntidadeDTO): Promise<EntidadeBeneficiaria> {
    const atual = await this.repo.buscarPorId(id);
    if (!atual) throw new NotFoundError('Entidade não encontrada.');

    const dados = normalizarEValidarEntidade(input);

    const comMesmoCnpj = await this.repo.buscarPorCnpj(dados.cnpj);
    if (comMesmoCnpj && comMesmoCnpj.id !== id) {
      throw new ConflictError(
        'Esta entidade (CNPJ) já está cadastrada no sistema.',
        'CNPJ_DUPLICADO',
      );
    }

    return this.repo.atualizar(id, {
      ...dados,
      estatutoDataAlteracao: carimboAlteracaoEstatuto(atual, dados.estatutoDataInicial),
    });
  }
}

/** Duas datas de dia (ou nulos) representam o mesmo dia? */
function mesmoDia(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return a === b || (!a && !b);
  return a.getTime() === b.getTime();
}

/**
 * Carimbo de "Data Alteração" do estatuto. Só marca hoje quando **já havia**
 * estatuto registrado e a data inicial mudou: o primeiro preenchimento é
 * cadastro, não alteração. Fora disso, preserva o que já estava gravado.
 */
export function carimboAlteracaoEstatuto(
  atual: Pick<
    EntidadeBeneficiaria,
    'estatutoArquivoNome' | 'estatutoDataInicial' | 'estatutoDataAlteracao'
  >,
  novaDataInicial: Date | null,
  hoje: Date = new Date(),
): Date | null {
  const tinhaEstatuto = !!(atual.estatutoArquivoNome || atual.estatutoDataInicial);
  if (tinhaEstatuto && !mesmoDia(atual.estatutoDataInicial, novaDataInicial)) return hoje;
  return atual.estatutoDataAlteracao;
}
