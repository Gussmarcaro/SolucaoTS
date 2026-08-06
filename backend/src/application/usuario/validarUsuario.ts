import { BusinessError } from '@/shared/errors';
import { apenasDigitos, isDocumentoValido } from '@/shared/validators/documento';
import type { NovoUsuarioDTO } from './dtos';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UF_REGEX = /^[A-Z]{2}$/;

/** Campos do usuário já normalizados/validados (sem senha). */
export type DadosUsuario = Omit<NovoUsuarioDTO, 'senhaHash'>;

/**
 * Normaliza e valida os dados de um usuário (exceto senha).
 * Reutilizado na criação e na edição.
 */
export function normalizarDadosUsuario(input: {
  nome: string;
  documento: string;
  documentoTipo: 'CPF' | 'CNPJ';
  grupoUsuarioId?: string | null;
  cep: string;
  logradouro: string;
  numero?: string | null;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  email: string;
  celular: string;
}): DadosUsuario {
  const nome = input.nome?.trim() ?? '';
  const documentoTipo = input.documentoTipo;
  const documento = apenasDigitos(input.documento);
  const cep = apenasDigitos(input.cep);
  const celular = apenasDigitos(input.celular);
  const uf = (input.uf ?? '').trim().toUpperCase();
  const email = (input.email ?? '').trim().toLowerCase();
  const logradouro = input.logradouro?.trim() ?? '';
  const bairro = input.bairro?.trim() ?? '';
  const cidade = input.cidade?.trim() ?? '';

  if (nome.length < 3) throw new BusinessError('Informe o nome completo / razão social.');
  if (documentoTipo !== 'CPF' && documentoTipo !== 'CNPJ')
    throw new BusinessError('Tipo de documento inválido. Use CPF ou CNPJ.');
  if (!isDocumentoValido(documento, documentoTipo))
    throw new BusinessError(`${documentoTipo} inválido.`);
  if (cep.length !== 8) throw new BusinessError('CEP inválido.');
  if (!logradouro) throw new BusinessError('Informe o endereço (logradouro).');
  if (!bairro) throw new BusinessError('Informe o bairro.');
  if (!cidade) throw new BusinessError('Informe a cidade.');
  if (!UF_REGEX.test(uf)) throw new BusinessError('UF inválida.');
  if (!EMAIL_REGEX.test(email)) throw new BusinessError('E-mail inválido.');
  if (celular.length < 10 || celular.length > 11)
    throw new BusinessError('Celular inválido. Informe DDD + número.');

  return {
    nome,
    documento,
    documentoTipo,
    grupoUsuarioId: input.grupoUsuarioId?.trim() || null,
    cep,
    logradouro,
    numero: input.numero?.trim() || null,
    complemento: input.complemento?.trim() || null,
    bairro,
    cidade,
    uf,
    email,
    celular,
  };
}
