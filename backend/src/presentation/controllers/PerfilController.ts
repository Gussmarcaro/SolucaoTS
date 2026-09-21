import type { Request, Response, NextFunction } from 'express';
import { AtualizarPerfilUseCase } from '@/application/usuario/AtualizarPerfilUseCase';
import { GerenciarUsuarioUseCase } from '@/application/usuario/GerenciarUsuarioUseCase';
import { PrismaUsuarioRepository } from '@/infrastructure/database/PrismaUsuarioRepository';
import { BusinessError, NotFoundError } from '@/shared/errors';

const repo = new PrismaUsuarioRepository();
const atualizarPerfil = new AtualizarPerfilUseCase(repo);
const gerenciar = new GerenciarUsuarioUseCase(repo);

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

  /** A própria foto. O id sai do token, como no resto desta classe. */
  async enviarFoto(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      if (!file) throw new BusinessError('Selecione a imagem.');
      return res.json(
        await gerenciar.salvarFoto(req.usuario!.id, {
          conteudo: file.buffer,
          tipo: file.mimetype,
        }),
      );
    } catch (error) {
      return next(error);
    }
  }

  async removerFoto(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await gerenciar.removerFoto(req.usuario!.id));
    } catch (error) {
      return next(error);
    }
  }
}
