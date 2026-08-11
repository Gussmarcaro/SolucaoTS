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

  /** Data opcional em ISO — recusa formato inválido e data no futuro. */
  const dataPassada = (valor: string | null | undefined, rotulo: string): Date | null => {
    if (!valor) return null;
    const d = new Date(valor);
    if (Number.isNaN(d.getTime())) throw new BusinessError(`${rotulo} inválida.`);
    if (d.getTime() > Date.now()) throw new BusinessError(`${rotulo} não pode ser futura.`);
    return d;
  };

  const dataConstituicao = dataPassada(input.dataConstituicao, 'Data de constituição');
  const dataUltimaAlteracao = dataPassada(input.dataUltimaAlteracao, 'Data da última alteração');
  const estatutoDataInicial = dataPassada(input.estatutoDataInicial, 'Data inicial do estatuto');
  const estatutoDataAlteracao = dataPassada(input.estatutoDataAlteracao, 'Data de alteração do estatuto');

  if (
    estatutoDataInicial &&
    estatutoDataAlteracao &&
    estatutoDataAlteracao.getTime() < estatutoDataInicial.getTime()
  )
    throw new BusinessError('A data de alteração do estatuto não pode ser anterior à data inicial.');

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
    finalidadeDescricao: input.finalidadeDescricao?.trim() || null,
    finalidadeArtigo: input.finalidadeArtigo?.trim() || null,
    dataUltimaAlteracao,
    estatutoDataInicial,
    estatutoDataAlteracao,
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
