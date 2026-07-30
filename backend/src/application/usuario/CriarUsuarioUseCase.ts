import type { Usuario } from '@/core/usuario/Usuario';
import type { IUsuarioRepository } from './IUsuarioRepository';
import type { CriarUsuarioDTO, NovoUsuarioDTO } from './dtos';
import { BusinessError, ConflictError } from '@/shared/errors';
import { apenasDigitos, isDocumentoValido } from '@/shared/validators/documento';
import { hashSenha, isSenhaForte } from '@/shared/auth/senha';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UF_REGEX = /^[A-Z]{2}$/;

export class CriarUsuarioUseCase {
  constructor(private readonly repo: IUsuarioRepository) {}

  async execute(input: CriarUsuarioDTO): Promise<Usuario> {
    const dados = this.normalizarEValidar(input);

    // Trava de duplicidade — o documento (CPF/CNPJ) é a chave primária de validação.
    const existente = await this.repo.buscarPorDocumento(dados.documento);
    if (existente) {
      throw new ConflictError(
        'Este CPF/CNPJ já está cadastrado em nossa base de dados.',
        'DOCUMENTO_DUPLICADO',
      );
    }

    const emailEmUso = await this.repo.buscarPorEmail(dados.email);
    if (emailEmUso) {
      throw new ConflictError('Este e-mail já está cadastrado.', 'EMAIL_DUPLICADO');
    }

    // Senha nunca é salva em texto puro.
    const senhaHash = await hashSenha(input.senha);
    const novo: NovoUsuarioDTO = { ...dados, senhaHash };
    return this.repo.criar(novo);
  }

  private normalizarEValidar(input: CriarUsuarioDTO): Omit<NovoUsuarioDTO, 'senhaHash'> {
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
    if (input.senha !== input.confirmarSenha)
      throw new BusinessError('As senhas não conferem.');
    if (!isSenhaForte(input.senha))
      throw new BusinessError(
        'Senha fraca: use no mínimo 8 caracteres, com 1 maiúscula, 1 número e 1 caractere especial.',
      );

    return {
      nome,
      documento,
      documentoTipo,
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
}
