import { BusinessError, NotFoundError } from '@/shared/errors';
import {
  ESFERAS,
  montarDemonstrativoIntegral,
  type DadosDemonstrativo,
  type DemonstrativoIntegral,
  type Esfera,
} from '@/core/documento/demonstrativoIntegral';

export interface IDemonstrativoRepository {
  dados(
    prestacaoId: string,
    saldoInformado: Partial<Record<Esfera, number>> | null,
  ): Promise<DadosDemonstrativo | null>;
}

/**
 * O Demonstrativo Integral de uma prestação de contas.
 *
 * O saldo do exercício anterior pode vir **informado** — é a saída para a
 * parceria com movimento anterior ao sistema. Ele chega pelo endereço
 * (`MUNICIPAL:1500,50;FEDERAL:0`) e **não é gravado**: é a decisão de quem
 * imprime, e gravá-lo faria o sistema afirmar como dado um número que ninguém
 * conferiu contra extrato.
 */
export class DemonstrativoUseCase {
  constructor(private readonly repo: IDemonstrativoRepository) {}

  async execute(prestacaoId: string, saldoAnterior?: string): Promise<DemonstrativoIntegral> {
    const dados = await this.repo.dados(prestacaoId, lerSaldo(saldoAnterior));
    if (!dados) throw new NotFoundError('Prestação não encontrada.');
    return montarDemonstrativoIntegral(dados);
  }
}

/** `"MUNICIPAL:1500,50;FEDERAL:0"` → `{ MUNICIPAL: 1500.5, FEDERAL: 0 }`. Vazio → null. */
export function lerSaldo(texto?: string): Partial<Record<Esfera, number>> | null {
  if (!texto?.trim()) return null;
  const out: Partial<Record<Esfera, number>> = {};
  for (const par of texto.split(';')) {
    const [esfera, valor] = par.split(':');
    const e = esfera?.trim().toUpperCase() as Esfera;
    if (!ESFERAS.includes(e)) throw new BusinessError(`Esfera inválida no saldo anterior: "${esfera}".`);
    const n = Number((valor ?? '').trim().replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(n)) throw new BusinessError(`Valor inválido no saldo anterior: "${valor}".`);
    out[e] = Math.round(n * 100) / 100;
  }
  return out;
}
