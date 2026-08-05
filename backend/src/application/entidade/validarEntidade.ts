import { BusinessError } from '@/shared/errors';
import { apenasDigitos, isCNPJValido } from '@/shared/validators/documento';
import type { CriarEntidadeDTO, DadosEntidade } from './dtos';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UF_REGEX = /^[A-Z]{2}$/;

/** Normaliza e valida os dados da entidade (reutilizado em criar/atualizar). */
export function normalizarEValidarEntidade(input: CriarEntidadeDTO): DadosEntidade {
  const razaoSocial = input.razaoSocial?.trim() ?? '';
  const cnpj = apenasDigitos(input.cnpj);
  const cep = apenasDigitos(input.cep);
  const uf = (input.uf ?? '').trim().toUpperCase();
  const email = (input.email ?? '').trim().toLowerCase();
  const logradouro = input.logradouro?.trim() ?? '';
  const bairro = input.bairro?.trim() ?? '';
  const cidade = input.cidade?.trim() ?? '';
  const telefoneFixo = input.telefoneFixo ? apenasDigitos(input.telefoneFixo) : null;
  const whatsapp = input.whatsapp ? apenasDigitos(input.whatsapp) : null;

  let dataConstituicao: Date | null = null;
  if (input.dataConstituicao) {
    const d = new Date(input.dataConstituicao);
    if (Number.isNaN(d.getTime())) throw new BusinessError('Data de constituição inválida.');
    if (d.getTime() > Date.now()) throw new BusinessError('Data de constituição não pode ser futura.');
    dataConstituicao = d;
  }

  if (razaoSocial.length < 2) throw new BusinessError('Informe a razão social.');
  if (!isCNPJValido(cnpj)) throw new BusinessError('CNPJ inválido.');
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
    razaoSocial,
    nomeFantasia: input.nomeFantasia?.trim() || null,
    cnpj,
    inscricaoEstadual: input.inscricaoEstadual?.trim() || null,
    inscricaoMunicipal: input.inscricaoMunicipal?.trim() || null,
    dataConstituicao,
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
