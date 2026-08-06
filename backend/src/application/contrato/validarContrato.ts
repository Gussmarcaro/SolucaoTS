import { BusinessError } from '@/shared/errors';
import { apenasDigitos, isDocumentoValido } from '@/shared/validators/documento';
import { parseDataISO } from '@/shared/datas';
import type { CriarContratoDTO, DadosContrato } from './dtos';

/** Normaliza e valida os dados do contrato (reutilizado em criar/atualizar). */
export function normalizarEValidarContrato(input: CriarContratoDTO): DadosContrato {
  const numero = input.numero?.trim() ?? '';
  const credorNome = input.credorNome?.trim() ?? '';
  const credorDocumentoTipo = input.credorDocumentoTipo;
  const credorDocumento = apenasDigitos(input.credorDocumento);
  const naturezaContratacao = input.naturezaContratacao?.trim() ?? '';
  const objeto = input.objeto?.trim() ?? '';

  if (!numero) throw new BusinessError('Informe o número do contrato.');
  if (credorNome.length < 2) throw new BusinessError('Informe o nome / razão social do credor.');
  if (credorDocumentoTipo !== 'CPF' && credorDocumentoTipo !== 'CNPJ')
    throw new BusinessError('Tipo de documento do credor inválido. Use CPF ou CNPJ.');
  if (!isDocumentoValido(credorDocumento, credorDocumentoTipo))
    throw new BusinessError(`${credorDocumentoTipo} do credor inválido.`);
  if (!naturezaContratacao) throw new BusinessError('Informe a natureza da contratação.');
  if (!objeto) throw new BusinessError('Informe o objeto do contrato.');

  let dataAssinatura: Date;
  try {
    dataAssinatura = parseDataISO(input.dataAssinatura);
  } catch {
    throw new BusinessError('Data de assinatura inválida.');
  }

  let vigenciaInicio: Date;
  try {
    vigenciaInicio = parseDataISO(input.vigenciaInicio);
  } catch {
    throw new BusinessError('Início de vigência inválido.');
  }

  let vigenciaFim: Date | null = null;
  if (input.vigenciaFim) {
    try {
      vigenciaFim = parseDataISO(input.vigenciaFim);
    } catch {
      throw new BusinessError('Fim de vigência inválido.');
    }
    if (vigenciaFim < vigenciaInicio)
      throw new BusinessError('O fim da vigência não pode ser anterior ao início.');
  }

  const valor =
    typeof input.valorMontante === 'string' ? Number(input.valorMontante) : input.valorMontante;
  if (!Number.isFinite(valor) || valor < 0) throw new BusinessError('Valor do contrato inválido.');

  return {
    numero,
    credorNome,
    credorDocumento,
    credorDocumentoTipo,
    naturezaContratacao,
    objeto,
    dataAssinatura,
    vigenciaInicio,
    vigenciaFim,
    valorMontante: valor,
  };
}
