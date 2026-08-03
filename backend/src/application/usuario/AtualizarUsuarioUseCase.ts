import type { Usuario } from '@/core/usuario/Usuario';
import type { IUsuarioRepository } from './IUsuarioRepository';
import type { AtualizarUsuarioDTO } from './dtos';
import { BusinessError, ConflictError, NotFoundError } from '@/shared/errors';
import { hashSenha, isSenhaForte } from '@/shared/auth/senha';
import { normalizarDadosUsuario } from './validarUsuario';

export class AtualizarUsuarioUseCase {
  constructor(private readonly repo: IUsuarioRepository) {}

  async execute(id: string, input: AtualizarUsuarioDTO): Promise<Usuario> {
    const atual = await this.repo.buscarPorId(id);
    if (!atual) throw new NotFoundError('Usuário não encontrado.');

    const dados = normalizarDadosUsuario(input);

    // Trava de duplicidade — outro registro com o mesmo documento/e-mail.
    const comMesmoDoc = await this.repo.buscarPorDocumento(dados.documento);
    if (comMesmoDoc && comMesmoDoc.id !== id) {
      throw new ConflictError(
        'Este CPF/CNPJ já está cadastrado em nossa base de dados.',
        'DOCUMENTO_DUPLICADO',
      );
    }
    const comMesmoEmail = await this.repo.buscarPorEmail(dados.email);
    if (comMesmoEmail && comMesmoEmail.id !== id) {
      throw new ConflictError('Este e-mail já está cadastrado.', 'EMAIL_DUPLICADO');
    }

    // Senha é opcional na edição: só altera se informada.
    let senhaHash: string | undefined;
    if (input.senha) {
      if (input.senha !== input.confirmarSenha) throw new BusinessError('As senhas não conferem.');
      if (!isSenhaForte(input.senha))
        throw new BusinessError(
          'Senha fraca: use no mínimo 8 caracteres, com 1 maiúscula, 1 número e 1 caractere especial.',
        );
      senhaHash = await hashSenha(input.senha);
    }

    return this.repo.atualizar(id, dados, senhaHash);
  }
}
