import { BusinessError } from '@/shared/errors';
import { parseDataISO } from '@/shared/datas';
import type { CriarAjusteDTO, DadosAjuste } from './dtos';
import type { Periodicidade, StatusAjuste, TipoAjuste } from '@/core/ajuste/Ajuste';

const TIPOS: TipoAjuste[] = [
  'CONTRATO_GESTAO',
  'CONVENIO',
  'TERMO_COLABORACAO',
  'TERMO_FOMENTO',
  'TERMO_PARCERIA',
];
const PERIODICIDADES: Periodicidade[] = ['ANUAL', 'QUADRIMESTRAL'];
const STATUS: StatusAjuste[] = ['EM_ELABORACAO', 'ENVIADO'];

/** Normaliza e valida os dados do ajuste (reutilizado em criar/atualizar). */
export function normalizarEValidarAjuste(input: CriarAjusteDTO): DadosAjuste {
  const clienteId = input.clienteId?.trim() || null;
  const entidadeBeneficiariaId = input.entidadeBeneficiariaId?.trim() ?? '';
  const codigoAjuste = input.codigoAjuste?.trim() ?? '';
  const objeto = input.objeto?.trim() ?? '';
  const nomeResumido = input.nomeResumido?.trim() || null;

  // Espelha o VarChar(80) do schema: cortar no banco viraria erro genérico.
  if (nomeResumido && nomeResumido.length > 80)
    throw new BusinessError('O nome resumido deve ter no máximo 80 caracteres.');

  if (!entidadeBeneficiariaId) throw new BusinessError('Selecione a entidade beneficiária.');
  if (!TIPOS.includes(input.tipoAjuste)) throw new BusinessError('Tipo de ajuste inválido.');
  if (!codigoAjuste) throw new BusinessError('Informe o código do ajuste (TCESP).');
  if (!objeto) throw new BusinessError('Informe o objeto do ajuste.');
  if (!PERIODICIDADES.includes(input.periodicidade))
    throw new BusinessError('Periodicidade inválida.');

  const status = input.status ?? 'EM_ELABORACAO';
  if (!STATUS.includes(status)) throw new BusinessError('Situação inválida.');

  let dataAssinatura: Date;
  try {
    dataAssinatura = parseDataISO(input.dataAssinatura);
  } catch {
    throw new BusinessError('Data de assinatura inválida.');
  }

  let vigenciaInicial: Date | null = null;
  if (input.vigenciaInicial) {
    try {
      vigenciaInicial = parseDataISO(input.vigenciaInicial);
    } catch {
      throw new BusinessError('Início de vigência inválido.');
    }
  }

  let vigenciaFinal: Date | null = null;
  if (input.vigenciaFinal) {
    try {
      vigenciaFinal = parseDataISO(input.vigenciaFinal);
    } catch {
      throw new BusinessError('Fim de vigência inválido.');
    }
    if (vigenciaInicial && vigenciaFinal < vigenciaInicial)
      throw new BusinessError('O fim da vigência não pode ser anterior ao início.');
  }

  const valor =
    typeof input.valorGlobal === 'string' ? Number(input.valorGlobal) : input.valorGlobal;
  if (!Number.isFinite(valor) || valor < 0) throw new BusinessError('Valor global inválido.');

  return {
    clienteId,
    entidadeBeneficiariaId,
    tipoAjuste: input.tipoAjuste,
    nomeResumido,
    codigoAjuste,
    numero: input.numero?.trim() || null,
    objeto,
    valorGlobal: valor,
    dataAssinatura,
    vigenciaInicial,
    vigenciaFinal,
    periodicidade: input.periodicidade,
    status,
  };
}
