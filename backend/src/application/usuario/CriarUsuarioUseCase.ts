import type { Usuario } from '@/core/usuario/Usuario';
import type { IUsuarioRepository } from './IUsuarioRepository';
import type { IGrupoRepository } from '@/application/grupo/IGrupoRepository';
import type { CriarUsuarioDTO, NovoUsuarioDTO } from './dtos';
import { BusinessError, ConflictError } from '@/shared/errors';
import { hashSenha, isSenhaForte } from '@/shared/auth/senha';
import { normalizarDadosUsuario } from './validarUsuario';
import { validarGrupoSelecionado } from './validarGrupoSelecionado';

export class CriarUsuarioUseCase {
  constructor(
    private readonly repo: IUsuarioRepository,
    private readonly grupos: IGrupoRepository,
  ) {}

  async execute(input: CriarUsuarioDTO): Promise<Usuario> {
    const dados = normalizarDadosUsuario(input);

    // Grupo (opcional): se informado, deve existir e estar ativo.
    await validarGrupoSelecionado(this.grupos, dados.grupoUsuarioId, null);

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

    // Senha (obrigatória na criação) — nunca salva em texto puro.
    if (input.senha !== input.confirmarSenha) throw new BusinessError('As senhas não conferem.');
    if (!isSenhaForte(input.senha))
      throw new BusinessError(
        'Senha fraca: use no mínimo 8 caracteres, com 1 maiúscula, 1 número e 1 caractere especial.',
      );

    const senhaHash = await hashSenha(input.senha);
    const novo: NovoUsuarioDTO = { ...dados, senhaHash };
    return this.repo.criar(novo);
  }
}
