import { BusinessError } from '@/shared/errors';
import { apenasDigitos, isDocumentoValido } from '@/shared/validators/documento';
import type { CriarFornecedorDTO, DadosFornecedor } from './dtos';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UF_REGEX = /^[A-Z]{2}$/;

/** Normaliza e valida os dados do fornecedor (reutilizado em criar/atualizar). */
export function normalizarEValidarFornecedor(input: CriarFornecedorDTO): DadosFornecedor {
  const nome = input.nome?.trim() ?? '';
  const documentoTipo = input.documentoTipo;
  const documento = apenasDigitos(input.documento);
  const cep = apenasDigitos(input.cep);
  const uf = (input.uf ?? '').trim().toUpperCase();
  const email = (input.email ?? '').trim().toLowerCase();
  const logradouro = input.logradouro?.trim() ?? '';
  const bairro = input.bairro?.trim() ?? '';
  const cidade = input.cidade?.trim() ?? '';
  const telefoneFixo = input.telefoneFixo ? apenasDigitos(input.telefoneFixo) : null;
  const whatsapp = input.whatsapp ? apenasDigitos(input.whatsapp) : null;

  if (nome.length < 2) throw new BusinessError('Informe o nome / razão social.');
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
  if (telefoneFixo && (telefoneFixo.length < 10 || telefoneFixo.length > 11))
    throw new BusinessError('Telefone fixo inválido.');
  if (whatsapp && (whatsapp.length < 10 || whatsapp.length > 11))
    throw new BusinessError('WhatsApp inválido.');

  return {
    nome,
    documento,
    documentoTipo,
    inscricaoEstadual: input.inscricaoEstadual?.trim() || null,
    cep,
    logradouro,
    numero: input.numero?.trim() || null,
    complemento: input.complemento?.trim() || null,
    bairro,
    cidade,
    uf,
    email,
    telefoneFixo,
    whatsapp,
  };
}
