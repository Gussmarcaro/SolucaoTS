import { BusinessError } from '@/shared/errors';
import { parseDataISO } from '@/shared/datas';
import type { CriarBemCedidoDTO, DadosBemCedido } from './dtos';

/** Normaliza e valida os dados do bem cedido (reutilizado em criar/atualizar). */
export function normalizarEValidarBemCedido(input: CriarBemCedidoDTO): DadosBemCedido {
  const descricao = input.descricao?.trim() ?? '';
  const tipo = input.tipo?.trim() ?? '';
  const identificador = input.identificador?.trim() ?? '';

  if (descricao.length < 2) throw new BusinessError('Informe a descrição do bem.');
  if (!tipo) throw new BusinessError('Informe o tipo do bem.');
  if (!identificador) throw new BusinessError('Informe o identificador (patrimônio/placa).');

  let dataCessao: Date;
  try {
    dataCessao = parseDataISO(input.dataCessao);
  } catch {
    throw new BusinessError('Data de cessão inválida.');
  }

  let dataDevolucao: Date | null = null;
  if (input.dataDevolucao) {
    try {
      dataDevolucao = parseDataISO(input.dataDevolucao);
    } catch {
      throw new BusinessError('Data de devolução inválida.');
    }
    if (dataDevolucao < dataCessao)
      throw new BusinessError('A devolução não pode ser anterior à cessão.');
  }

  const valor = typeof input.valor === 'string' ? Number(input.valor) : input.valor;
  if (!Number.isFinite(valor) || valor < 0) throw new BusinessError('Valor do bem inválido.');

  return {
    descricao,
    tipo,
    identificador,
    valor,
    dataCessao,
    dataDevolucao,
    observacao: input.observacao?.trim() || null,
  };
}
