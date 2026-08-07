import type { TipoOrgao, Periodicidade } from '@prisma/client';
import { BusinessError } from '@/shared/errors';
import { apenasDigitos, isCNPJValido } from '@/shared/validators/documento';
import type { CriarClienteDTO, DadosCliente } from './dtos';

const TIPOS_ORGAO = [
  'PREFEITURA_MUNICIPAL',
  'CAMARA',
  'AUTARQUIA_MUNICIPAL',
  'CONSORCIO_MUNICIPAL',
  'FUNDACAO_MUNICIPAL',
  'FUNDO_PREVIDENCIA_MUNICIPAL',
  'EMPRESA_PUBLICA',
  'UNIDADE_SECRETARIA',
] as const;
const PERIODICIDADES = ['ANUAL', 'QUADRIMESTRAL'] as const;

/** Normaliza e valida os dados do órgão (reutilizado em criar/atualizar). */
export function normalizarEValidarCliente(input: CriarClienteDTO): DadosCliente {
  const nome = input.nome?.trim() ?? '';
  const cnpj = apenasDigitos(input.cnpj ?? '');
  const codigoMunicipio = Number(input.codigoMunicipio);
  const codigoEntidade = Number(input.codigoEntidade);
  const tipoOrgao = String(input.tipoOrgao ?? '').trim().toUpperCase();
  const periodicidade = String(input.periodicidade ?? '').trim().toUpperCase();

  if (nome.length < 2) throw new BusinessError('Informe o nome do órgão.');
  if (!Number.isInteger(codigoMunicipio) || codigoMunicipio < 1 || codigoMunicipio > 9999)
    throw new BusinessError('Código de município inválido (1–9999).');
  if (!Number.isInteger(codigoEntidade) || codigoEntidade < 1 || codigoEntidade > 99999)
    throw new BusinessError('Código de entidade inválido (1–99999).');
  if (!TIPOS_ORGAO.includes(tipoOrgao as (typeof TIPOS_ORGAO)[number]))
    throw new BusinessError('Tipo de órgão inválido.');
  if (!PERIODICIDADES.includes(periodicidade as (typeof PERIODICIDADES)[number]))
    throw new BusinessError('Periodicidade inválida.');
  if (!isCNPJValido(cnpj)) throw new BusinessError('CNPJ inválido.');

  return {
    nome,
    codigoMunicipio,
    codigoEntidade,
    tipoOrgao: tipoOrgao as TipoOrgao,
    periodicidade: periodicidade as Periodicidade,
    cnpj,
  };
}
