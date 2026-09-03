import type { Usuario } from '@/core/usuario/Usuario';
import type { IUsuarioRepository } from './IUsuarioRepository';
import type { AtualizarPerfilDTO } from './dtos';
import { BusinessError, ConflictError, NotFoundError } from '@/shared/errors';
import { compararSenha, hashSenha, isSenhaForte } from '@/shared/auth/senha';
import { normalizarDadosUsuario } from './validarUsuario';

/**
 * O usuário editando os **próprios** dados.
 *
 * Existe separado de `AtualizarUsuarioUseCase` por uma razão de segurança, não
 * de conveniência: aquele é o administrador operando o cadastro de qualquer um,
 * e aceita `grupoUsuarioId` no corpo. Reaproveitá-lo aqui daria a todo usuário
 * autenticado o poder de se promover ao grupo que quisesse — a escalada de
 * privilégio mais barata que existe. **O grupo do usuário é preservado do
 * registro atual e nunca lido da entrada**; o mesmo vale para órgão e situação.
 *
 * Duas alterações exigem a senha atual, porque as duas entregam a conta a quem
 * estiver na frente de uma sessão esquecida aberta:
 *  - trocar a senha;
 *  - trocar o e-mail, que **é** o login.
 */
export class AtualizarPerfilUseCase {
  constructor(private readonly repo: IUsuarioRepository) {}

  async execute(id: string, input: AtualizarPerfilDTO): Promise<Usuario> {
    const atual = await this.repo.buscarPorId(id);
    if (!atual) throw new NotFoundError('Usuário não encontrado.');

    // O grupo sai do registro, não da entrada — ver o comentário da classe.
    const dados = normalizarDadosUsuario({ ...input, grupoUsuarioId: atual.grupoUsuarioId });

    const trocaEmail = dados.email !== atual.email;
    const trocaSenha = !!input.novaSenha;

    if (trocaEmail || trocaSenha) {
      const auth = await this.repo.buscarAuthPorEmail(atual.email);
      if (!auth?.senhaHash) throw new BusinessError('Não foi possível conferir a senha atual.');
      if (!input.senhaAtual)
        throw new BusinessError(
          trocaSenha
            ? 'Informe a senha atual para definir uma nova.'
            : 'Informe a senha atual para alterar o e-mail de acesso.',
        );
      if (!(await compararSenha(input.senhaAtual, auth.senhaHash)))
        throw new BusinessError('Senha atual incorreta.');
    }

    // Duplicidade: o CPF não é editável na tela, mas a checagem fica porque a
    // rota responde a qualquer corpo, não só ao que o formulário envia.
    const comMesmoDoc = await this.repo.buscarPorDocumento(dados.documento);
    if (comMesmoDoc && comMesmoDoc.id !== id)
      throw new ConflictError(
        'Este CPF já está cadastrado em nossa base de dados.',
        'DOCUMENTO_DUPLICADO',
      );
    if (trocaEmail) {
      const comMesmoEmail = await this.repo.buscarPorEmail(dados.email);
      if (comMesmoEmail && comMesmoEmail.id !== id)
        throw new ConflictError('Este e-mail já está cadastrado.', 'EMAIL_DUPLICADO');
    }

    let senhaHash: string | undefined;
    if (trocaSenha) {
      if (input.novaSenha !== input.confirmarSenha)
        throw new BusinessError('As senhas não conferem.');
      if (!isSenhaForte(input.novaSenha!))
        throw new BusinessError(
          'Senha fraca: use no mínimo 8 caracteres, com 1 maiúscula, 1 número e 1 caractere especial.',
        );
      if (input.novaSenha === input.senhaAtual)
        throw new BusinessError('A nova senha precisa ser diferente da atual.');
      senhaHash = await hashSenha(input.novaSenha!);
    }

    return this.repo.atualizar(id, dados, senhaHash);
  }
}
