import type { TermoAditivo } from '@/core/termoAditivo/TermoAditivo';
import type { ITermoAditivoRepository } from './ITermoAditivoRepository';
import type { IAjusteRepository } from '@/application/ajuste/IAjusteRepository';
import type { DadosTermoAditivo, TermoAditivoDTO } from './dtos';
import { BusinessError, NotFoundError } from '@/shared/errors';
import { parseDataISO } from '@/shared/datas';

function numeroOpcional(v: unknown, campo: string): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = typeof v === 'string' ? Number(v) : (v as number);
  if (!Number.isFinite(n) || n < 0) throw new BusinessError(`${campo} inválido.`);
  return n;
}

function validar(input: TermoAditivoDTO): DadosTermoAditivo {
  const numero = input.numero?.trim() ?? '';
  if (!numero) throw new BusinessError('Informe o número do termo aditivo.');

  let dataAssinatura: Date;
  try {
    dataAssinatura = parseDataISO(input.dataAssinatura);
  } catch {
    throw new BusinessError('Data de assinatura inválida.');
  }

  return {
    numero,
    dataAssinatura,
    valorAcrescido: numeroOpcional(input.valorAcrescido, 'Valor acrescido'),
    valorSuprimido: numeroOpcional(input.valorSuprimido, 'Valor suprimido'),
  };
}

export class TermoAditivoUseCases {
  constructor(
    private readonly repo: ITermoAditivoRepository,
    private readonly ajustes: IAjusteRepository,
  ) {}

  private async garantirAjuste(ajusteId: string) {
    if (!(await this.ajustes.buscarPorId(ajusteId)))
      throw new NotFoundError('Ajuste não encontrado.');
  }

  private async garantirTermoNoAjuste(ajusteId: string, id: string): Promise<TermoAditivo> {
    const termo = await this.repo.buscarPorId(id);
    if (!termo || termo.ajusteId !== ajusteId)
      throw new NotFoundError('Termo aditivo não encontrado.');
    return termo;
  }

  async listar(ajusteId: string): Promise<TermoAditivo[]> {
    await this.garantirAjuste(ajusteId);
    return this.repo.listarPorAjuste(ajusteId);
  }

  async criar(ajusteId: string, input: TermoAditivoDTO): Promise<TermoAditivo> {
    await this.garantirAjuste(ajusteId);
    return this.repo.criar(ajusteId, validar(input));
  }

  async atualizar(ajusteId: string, id: string, input: TermoAditivoDTO): Promise<TermoAditivo> {
    await this.garantirTermoNoAjuste(ajusteId, id);
    return this.repo.atualizar(id, validar(input));
  }

  async excluir(ajusteId: string, id: string): Promise<void> {
    await this.garantirTermoNoAjuste(ajusteId, id);
    await this.repo.excluir(id);
  }
}
