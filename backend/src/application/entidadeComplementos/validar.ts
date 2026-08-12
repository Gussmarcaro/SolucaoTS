import { BusinessError } from '@/shared/errors';
import { apenasDigitos, isCPFValido } from '@/shared/validators/documento';
import { parseDataISO } from '@/shared/datas';
import type {
  TipoConselho,
  TipoDocumentoRegularidade,
} from '@/core/entidade/complementos';
import type {
  DadosDocumentoRegularidade,
  DadosMembroConselho,
  DadosMembroDiretoria,
  DadosPessoa,
  DocumentoRegularidadeDTO,
  MembroConselhoDTO,
  MembroDiretoriaDTO,
  PessoaDTO,
} from './dtos';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TIPOS_CONSELHO: TipoConselho[] = ['ADMINISTRACAO', 'FISCAL', 'ESPECIAIS'];

const TIPOS_DOCUMENTO: TipoDocumentoRegularidade[] = [
  'FEDERAL',
  'ESTADUAL',
  'MUNICIPAL',
  'FGTS',
  'TRABALHISTA',
  'CEBAS',
  'UTILIDADE_PUBLICA',
  'ENTIDADE_BENEFICENTE',
  'OUTRAS',
];

/** Data opcional em ISO. `futuroProibido` recusa data adiante de hoje. */
export function dataOpcional(
  valor: string | null | undefined,
  rotulo: string,
  futuroProibido = false,
): Date | null {
  if (!valor) return null;
  let d: Date;
  try {
    d = parseDataISO(valor);
  } catch {
    throw new BusinessError(`${rotulo} inválida.`);
  }
  if (futuroProibido && d.getTime() > Date.now())
    throw new BusinessError(`${rotulo} não pode ser futura.`);
  return d;
}

/**
 * Normaliza e valida os dados de pessoa (diretoria e conselhos usam os mesmos).
 * Só o nome é obrigatório: o resto costuma chegar aos poucos, conforme a
 * entidade envia a documentação.
 */
function normalizarPessoa(input: PessoaDTO): DadosPessoa {
  const nome = input.nome?.trim() ?? '';
  if (nome.length < 3) throw new BusinessError('Informe o nome completo do membro.');

  const cpf = input.cpf ? apenasDigitos(input.cpf) : null;
  if (cpf && !isCPFValido(cpf)) throw new BusinessError('CPF inválido.');

  const email = input.email?.trim().toLowerCase() || null;
  if (email && !EMAIL_REGEX.test(email)) throw new BusinessError('E-mail inválido.');

  const telefone = input.telefone ? apenasDigitos(input.telefone) : null;
  if (telefone && (telefone.length < 10 || telefone.length > 11))
    throw new BusinessError('Telefone inválido. Informe DDD + número.');

  const cep = input.cep ? apenasDigitos(input.cep) : null;
  if (cep && cep.length !== 8) throw new BusinessError('CEP inválido.');

  const uf = input.uf?.trim().toUpperCase() || null;
  if (uf && !/^[A-Z]{2}$/.test(uf)) throw new BusinessError('UF inválida.');

  const dataEntrada = dataOpcional(input.dataEntrada, 'Data de entrada');
  const dataSaida = dataOpcional(input.dataSaida, 'Data de saída');
  if (dataEntrada && dataSaida && dataSaida < dataEntrada)
    throw new BusinessError('A data de saída não pode ser anterior à de entrada.');

  return {
    nome,
    cpf,
    dataNascimento: dataOpcional(input.dataNascimento, 'Data de nascimento', true),
    cep,
    logradouro: input.logradouro?.trim() || null,
    numero: input.numero?.trim() || null,
    complemento: input.complemento?.trim() || null,
    bairro: input.bairro?.trim() || null,
    cidade: input.cidade?.trim() || null,
    uf,
    email,
    telefone,
    cargo: input.cargo?.trim() || null,
    dataEntrada,
    dataSaida,
  };
}

export function normalizarMembroDiretoria(input: MembroDiretoriaDTO): DadosMembroDiretoria {
  const possuiRemuneracao = input.possuiRemuneracao === true;
  return {
    ...normalizarPessoa(input),
    ataDataEleicao: dataOpcional(input.ataDataEleicao, 'Data da eleição'),
    ataDataRegistro: dataOpcional(input.ataDataRegistro, 'Data do registro'),
    ataLocalRegistro: input.ataLocalRegistro?.trim() || null,
    possuiRemuneracao,
    // Sem remuneração, previsão estatutária e valores não fazem sentido: são
    // limpos aqui para o registro não guardar dado órfão de um "sim" desfeito.
    remuneracaoDescricao: possuiRemuneracao ? input.remuneracaoDescricao?.trim() || null : null,
    remuneracaoArtigo: possuiRemuneracao ? input.remuneracaoArtigo?.trim() || null : null,
    remuneracaoValores: possuiRemuneracao ? (input.remuneracaoValores ?? null) : null,
  };
}

export function normalizarMembroConselho(input: MembroConselhoDTO): DadosMembroConselho {
  if (!TIPOS_CONSELHO.includes(input.tipoConselho))
    throw new BusinessError('Selecione o tipo de conselho.');
  return {
    ...normalizarPessoa(input),
    tipoConselho: input.tipoConselho,
    ataDataNomeacao: dataOpcional(input.ataDataNomeacao, 'Data da nomeação'),
    ataDataRegistro: dataOpcional(input.ataDataRegistro, 'Data do registro'),
    ataLocalRegistro: input.ataLocalRegistro?.trim() || null,
  };
}

export function normalizarDocumento(
  input: DocumentoRegularidadeDTO,
): DadosDocumentoRegularidade {
  if (!TIPOS_DOCUMENTO.includes(input.tipo))
    throw new BusinessError('Tipo de documento inválido.');

  const dataGeracao = dataOpcional(input.dataGeracao, 'Data da geração');
  const dataVencimento = dataOpcional(input.dataVencimento, 'Data do vencimento');
  if (dataGeracao && dataVencimento && dataVencimento < dataGeracao)
    throw new BusinessError('O vencimento não pode ser anterior à geração.');

  return {
    tipo: input.tipo,
    arquivoNome: input.arquivoNome?.trim() || null,
    dataGeracao,
    dataVencimento,
    publicacao: input.publicacao?.trim() || null,
    orgaoEmissor: input.orgaoEmissor?.trim() || null,
    legislacao: input.legislacao?.trim() || null,
    data: dataOpcional(input.data, 'Data'),
  };
}

/** Valida o PDF recebido: não vazio, dentro do limite e realmente um PDF. */
export function validarPdf(arquivo: { tamanho: number; conteudo: Buffer }): void {
  if (!arquivo.tamanho) throw new BusinessError('O arquivo está vazio.');
  if (arquivo.tamanho > 5 * 1024 * 1024) throw new BusinessError('O arquivo excede 5 MB.');
  if (arquivo.conteudo.subarray(0, 5).toString('latin1') !== '%PDF-')
    throw new BusinessError('O arquivo enviado não é um PDF válido.');
}
