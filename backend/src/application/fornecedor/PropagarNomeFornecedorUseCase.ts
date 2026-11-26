import { NotFoundError } from '@/shared/errors';
import type { LevantamentoNome } from '@/core/fornecedor/propagacaoNome';

export interface IPropagacaoNomeRepository {
  /** O que tem o nome antigo e o que pode ser atualizado. Null = fornecedor não existe. */
  levantar(fornecedorId: string): Promise<LevantamentoNome | null>;
  /** Atualiza só as cópias que podem acompanhar; devolve o levantamento de depois. */
  aplicar(fornecedorId: string): Promise<{ atualizadas: number; depois: LevantamentoNome } | null>;
}

/**
 * Leva o nome novo do fornecedor às notas e contratos que ainda não foram ao
 * TCESP — ver `core/fornecedor/propagacaoNome`.
 *
 * Duas operações, e não uma automática dentro do "salvar": quem renomeia
 * decide. Às vezes o nome antigo é o certo para a nota — a razão social de MEI
 * traz o CNPJ na frente, e é assim que ela sai impressa — e corrigir o
 * cadastro não pode reescrever o que a pessoa não pediu.
 */
export class PropagarNomeFornecedorUseCase {
  constructor(private readonly repo: IPropagacaoNomeRepository) {}

  async levantar(id: string): Promise<LevantamentoNome> {
    const r = await this.repo.levantar(id);
    if (!r) throw new NotFoundError('Fornecedor não encontrado.');
    return r;
  }

  async aplicar(id: string) {
    const r = await this.repo.aplicar(id);
    if (!r) throw new NotFoundError('Fornecedor não encontrado.');
    return r;
  }
}
