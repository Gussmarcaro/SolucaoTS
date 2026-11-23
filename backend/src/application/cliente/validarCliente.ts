import type { TipoOrgao, Periodicidade } from '@prisma/client';
import { BusinessError } from '@/shared/errors';
import { apenasDigitos, isCNPJValido, isCPFValido } from '@/shared/validators/documento';
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

  /*
   * Os signatários são opcionais — o órgão opera sem eles —, mas o CPF, quando
   * informado, tem de ser válido: ele vai impresso num documento que se assina
   * perante o Tribunal, e é por ele que o CadTCESP identifica a pessoa.
   */
  const texto = (v: string | null | undefined) => v?.trim() || null;
  const cpf = (v: string | null | undefined, quem: string) => {
    const d = apenasDigitos(v ?? '');
    if (!d) return null;
    if (!isCPFValido(d)) throw new BusinessError(`CPF ${quem} inválido.`);
    return d;
  };
  const autoridadeCpf = cpf(input.autoridadeCpf, 'da autoridade máxima');
  const ordenadorCpf = cpf(input.ordenadorCpf, 'do ordenador de despesa');

  return {
    nome,
    codigoMunicipio,
    codigoEntidade,
    tipoOrgao: tipoOrgao as TipoOrgao,
    // Ausente = true. O bloco de empenhos e obrigatorio no envio, entao a
    // omissao nao pode desligar a aba de quem simplesmente nao mexeu no campo.
    empenhaRepasse: input.empenhaRepasse !== false,
    periodicidade: periodicidade as Periodicidade,
    cnpj,
    autoridadeNome: texto(input.autoridadeNome),
    autoridadeCargo: texto(input.autoridadeCargo),
    autoridadeCpf,
    ordenadorNome: texto(input.ordenadorNome),
    ordenadorCargo: texto(input.ordenadorCargo),
    ordenadorCpf,
  };
}
