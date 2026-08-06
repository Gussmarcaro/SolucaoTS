import type { Contrato } from '@/core/contrato/Contrato';
import type { IContratoRepository } from './IContratoRepository';
import type { FiltrosContrato, Paginado } from './dtos';

const PAGE_SIZE_PADRAO = 10;
const PAGE_SIZE_MAX = 100;
const CAMPOS_ORDENAVEIS = [
  'numero',
  'credorNome',
  'naturezaContratacao',
  'dataAssinatura',
  'valorMontante',
  'ativo',
  'criadoEm',
];

export class ListarContratosUseCase {
  constructor(private readonly repo: IContratoRepository) {}

  async execute(params: {
    filtros?: FiltrosContrato;
    busca?: string;
    orderBy?: string;
    orderDir?: string;
    page?: number;
    pageSize?: number;
  }): Promise<Paginado<Contrato>> {
    const page = Math.max(1, Math.trunc(params.page ?? 1));
    const pageSize = Math.min(
      PAGE_SIZE_MAX,
      Math.max(1, Math.trunc(params.pageSize ?? PAGE_SIZE_PADRAO)),
    );

    const entrada = params.filtros ?? {};
    const filtros: FiltrosContrato = {};
    if (entrada.numero?.trim()) filtros.numero = entrada.numero.trim();
    if (entrada.credorNome?.trim()) filtros.credorNome = entrada.credorNome.trim();
    if (entrada.credorDocumento?.trim()) filtros.credorDocumento = entrada.credorDocumento.trim();
    if (entrada.naturezaContratacao?.trim())
      filtros.naturezaContratacao = entrada.naturezaContratacao.trim();
    if (typeof entrada.ativo === 'boolean') filtros.ativo = entrada.ativo;

    const busca = params.busca?.trim() || undefined;

    const campo =
      params.orderBy && CAMPOS_ORDENAVEIS.includes(params.orderBy) ? params.orderBy : undefined;
    const ordem = campo
      ? { campo, direcao: params.orderDir === 'asc' ? ('asc' as const) : ('desc' as const) }
      : undefined;

    return this.repo.listar({ filtros, busca, ordem, page, pageSize });
  }
}
