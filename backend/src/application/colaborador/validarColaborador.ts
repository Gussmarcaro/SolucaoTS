import { BusinessError } from '@/shared/errors';
import { apenasDigitos, isDocumentoValido } from '@/shared/validators/documento';
import { parseDataISO } from '@/shared/datas';
import type { CriarColaboradorDTO, DadosColaborador } from './dtos';

/** Normaliza e valida os dados do colaborador (reutilizado em criar/atualizar). */
export function normalizarEValidarColaborador(input: CriarColaboradorDTO): DadosColaborador {
  const nome = input.nome?.trim() ?? '';
  const cpf = apenasDigitos(input.cpf);
  const cargo = input.cargo?.trim() ?? '';
  const cbo = input.cbo ? apenasDigitos(input.cbo) : null;
  const cns = input.cns ? apenasDigitos(input.cns) : null;

  if (nome.length < 2) throw new BusinessError('Informe o nome do colaborador.');
  if (!isDocumentoValido(cpf, 'CPF')) throw new BusinessError('CPF inválido.');
  if (!cargo) throw new BusinessError('Informe o cargo / função.');
  if (cbo && cbo.length !== 6) throw new BusinessError('CBO deve ter 6 dígitos.');
  if (cns && cns.length !== 15) throw new BusinessError('CNS deve ter 15 dígitos.');

  let dataAdmissao: Date;
  try {
    dataAdmissao = parseDataISO(input.dataAdmissao);
  } catch {
    throw new BusinessError('Data de admissão inválida.');
  }

  let dataDemissao: Date | null = null;
  if (input.dataDemissao) {
    try {
      dataDemissao = parseDataISO(input.dataDemissao);
    } catch {
      throw new BusinessError('Data de demissão inválida.');
    }
    if (dataDemissao < dataAdmissao)
      throw new BusinessError('A data de demissão não pode ser anterior à admissão.');
  }

  const salario =
    typeof input.salarioContratual === 'string'
      ? Number(input.salarioContratual)
      : input.salarioContratual;
  if (!Number.isFinite(salario) || salario < 0)
    throw new BusinessError('Salário contratual inválido.');

  return { nome, cpf, cargo, cbo, cns, dataAdmissao, dataDemissao, salarioContratual: salario };
}
