import { BusinessError } from '@/shared/errors';
import { apenasDigitos, isDocumentoValido } from '@/shared/validators/documento';
import { parseDataISO } from '@/shared/datas';
import type { CriarServidorCedidoDTO, DadosServidorCedido } from './dtos';

/** Normaliza e valida os dados do servidor cedido (reutilizado em criar/atualizar). */
export function normalizarEValidarServidorCedido(
  input: CriarServidorCedidoDTO,
): DadosServidorCedido {
  const nome = input.nome?.trim() ?? '';
  const cpf = apenasDigitos(input.cpf);
  const cargoPublico = input.cargoPublico?.trim() ?? '';
  const funcaoEntidade = input.funcaoEntidade?.trim() ?? '';
  const onusPagamento = input.onusPagamento?.trim() ?? '';

  if (nome.length < 2) throw new BusinessError('Informe o nome do servidor.');
  if (!isDocumentoValido(cpf, 'CPF')) throw new BusinessError('CPF inválido.');
  if (!cargoPublico) throw new BusinessError('Informe o cargo público.');
  if (!funcaoEntidade) throw new BusinessError('Informe a função na entidade.');
  if (!onusPagamento) throw new BusinessError('Informe o ônus do pagamento.');

  let cargaHoraria: number | null = null;
  if (input.cargaHoraria !== undefined && input.cargaHoraria !== null && input.cargaHoraria !== '') {
    const n = typeof input.cargaHoraria === 'string' ? Number(input.cargaHoraria) : input.cargaHoraria;
    if (!Number.isFinite(n) || n < 0) throw new BusinessError('Carga horária inválida.');
    cargaHoraria = Math.trunc(n);
  }

  const remuneracao =
    typeof input.remuneracaoBruta === 'string'
      ? Number(input.remuneracaoBruta)
      : input.remuneracaoBruta;
  if (!Number.isFinite(remuneracao) || remuneracao < 0)
    throw new BusinessError('Remuneração bruta inválida.');

  let dataInicialCessao: Date;
  try {
    dataInicialCessao = parseDataISO(input.dataInicialCessao);
  } catch {
    throw new BusinessError('Data inicial da cessão inválida.');
  }

  let dataFinalCessao: Date | null = null;
  if (input.dataFinalCessao) {
    try {
      dataFinalCessao = parseDataISO(input.dataFinalCessao);
    } catch {
      throw new BusinessError('Data final da cessão inválida.');
    }
    if (dataFinalCessao < dataInicialCessao)
      throw new BusinessError('A data final não pode ser anterior à inicial.');
  }

  return {
    nome,
    cpf,
    cargoPublico,
    funcaoEntidade,
    onusPagamento,
    cargaHoraria,
    remuneracaoBruta: remuneracao,
    dataInicialCessao,
    dataFinalCessao,
  };
}
