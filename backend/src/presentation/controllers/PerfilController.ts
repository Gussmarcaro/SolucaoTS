import type { Request, Response, NextFunction } from 'express';
import { AtualizarPerfilUseCase } from '@/application/usuario/AtualizarPerfilUseCase';
import { PrismaUsuarioRepository } from '@/infrastructure/database/PrismaUsuarioRepository';
import { NotFoundError } from '@/shared/errors';

const repo = new PrismaUsuarioRepository();
const atualizarPerfil = new AtualizarPerfilUseCase(repo);

/**
 * "Meu Perfil" — o usuário lendo e editando o próprio cadastro.
 *
 * O id **nunca** vem da URL nem do corpo: sai do token (`req.usuario!.id`).
 * Aceitá-lo do cliente transformaria esta rota, que é aberta a todo usuário
 * autenticado, na edição de qualquer cadastro do sistema.
 */
export class PerfilController {
  async meu(req: Request, res: Response, next: NextFunction) {
    try {
      const usuario = await repo.buscarPorId(req.usuario!.id);
      if (!usuario) throw new NotFoundError('Usuário não encontrado.');
      return res.json(usuario);
    } catch (error) {
      return next(error);
    }
  }

  async atualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const usuario = await atualizarPerfil.execute(req.usuario!.id, req.body);
      return res.json(usuario);
    } catch (error) {
      return next(error);
    }
  }
}
