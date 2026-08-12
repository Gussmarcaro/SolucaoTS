import { BusinessError } from '@/shared/errors';
import { parseDataISO } from '@/shared/datas';
import { apenasDigitos, isCPFValido } from '@/shared/validators/documento';
import type { CriarAjusteDTO, DadosAjuste } from './dtos';
import type { Periodicidade, StatusAjuste, TipoAjuste } from '@/core/ajuste/Ajuste';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const descricaoResumida = input.descricaoResumida?.trim() || null;

  // Espelha o VarChar(80) do schema: cortar no banco viraria erro genérico.
  if (descricaoResumida && descricaoResumida.length > 80)
    throw new BusinessError('A descrição resumida deve ter no máximo 80 caracteres.');

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

  // ---- Previsão por fontes de recursos ----
  const previsao = (v: number | string | null | undefined, esfera: string): number | null => {
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'string' ? Number(v) : v;
    if (!Number.isFinite(n) || n < 0) throw new BusinessError(`Previsão ${esfera} inválida.`);
    return n;
  };
  const previsaoFederal = previsao(input.previsaoFederal, 'federal');
  const previsaoEstadual = previsao(input.previsaoEstadual, 'estadual');
  const previsaoMunicipal = previsao(input.previsaoMunicipal, 'municipal');

  // ---- Responsável ----
  const responsavelCpf = input.responsavelCpf ? apenasDigitos(input.responsavelCpf) : null;
  if (responsavelCpf && !isCPFValido(responsavelCpf))
    throw new BusinessError('CPF do responsável inválido.');

  const responsavelEmail = input.responsavelEmail?.trim().toLowerCase() || null;
  if (responsavelEmail && !EMAIL_REGEX.test(responsavelEmail))
    throw new BusinessError('E-mail do responsável inválido.');

  const responsavelTelefone = input.responsavelTelefone
    ? apenasDigitos(input.responsavelTelefone)
    : null;
  if (responsavelTelefone && (responsavelTelefone.length < 10 || responsavelTelefone.length > 11))
    throw new BusinessError('Telefone do responsável inválido. Informe DDD + número.');

  /** Data opcional em ISO; `futuroProibido` recusa data adiante de hoje. */
  const dataOpcional = (
    valorIso: string | null | undefined,
    rotulo: string,
    futuroProibido = false,
  ): Date | null => {
    if (!valorIso) return null;
    let d: Date;
    try {
      d = parseDataISO(valorIso);
    } catch {
      throw new BusinessError(`${rotulo} inválida.`);
    }
    if (futuroProibido && d.getTime() > Date.now())
      throw new BusinessError(`${rotulo} não pode ser futura.`);
    return d;
  };

  const responsavelDataNascimento = dataOpcional(
    input.responsavelDataNascimento,
    'Data de nascimento do responsável',
    true,
  );
  const responsavelDataEntrada = dataOpcional(
    input.responsavelDataEntrada,
    'Data de entrada do responsável',
  );
  const responsavelDataSaida = dataOpcional(
    input.responsavelDataSaida,
    'Data de saída do responsável',
  );
  if (
    responsavelDataEntrada &&
    responsavelDataSaida &&
    responsavelDataSaida < responsavelDataEntrada
  )
    throw new BusinessError('A saída do responsável não pode ser anterior à entrada.');

  // ---- Publicação ----
  const publicacaoLink = input.publicacaoLink?.trim() || null;
  // Só http(s): o link vira um `window.open` na tela, e esquemas como
  // `javascript:` executariam script no navegador de quem clicasse.
  if (publicacaoLink && !/^https?:\/\/\S+$/i.test(publicacaoLink))
    throw new BusinessError('O link da publicação deve começar com http:// ou https://.');

  const publicacaoData = dataOpcional(input.publicacaoData, 'Data da publicação');

  return {
    clienteId,
    entidadeBeneficiariaId,
    tipoAjuste: input.tipoAjuste,
    descricaoResumida,
    codigoAjuste,
    numero: input.numero?.trim() || null,
    objeto,
    valorGlobal: valor,
    dataAssinatura,
    vigenciaInicial,
    vigenciaFinal,
    periodicidade: input.periodicidade,
    status,

    previsaoFederal,
    previsaoEstadual,
    previsaoMunicipal,

    responsavelNome: input.responsavelNome?.trim() || null,
    responsavelCpf,
    responsavelDataNascimento,
    responsavelEndereco: input.responsavelEndereco?.trim() || null,
    responsavelEmail,
    responsavelTelefone,
    responsavelCargo: input.responsavelCargo?.trim() || null,
    responsavelDataEntrada,
    responsavelDataSaida,

    publicacaoLocal: input.publicacaoLocal?.trim() || null,
    publicacaoLink,
    publicacaoData,
  };
}
