import type { Request, Response, NextFunction } from 'express';
import { CriarUsuarioUseCase } from '@/application/usuario/CriarUsuarioUseCase';
import { ListarUsuariosUseCase } from '@/application/usuario/ListarUsuariosUseCase';
import { PrismaUsuarioRepository } from '@/infrastructure/database/PrismaUsuarioRepository';
import type { FiltrosUsuario } from '@/application/usuario/dtos';

const repo = new PrismaUsuarioRepository();
const criarUsuario = new CriarUsuarioUseCase(repo);
const listarUsuarios = new ListarUsuariosUseCase(repo);

export class UsuarioController {
  async criar(req: Request, res: Response, next: NextFunction) {
    try {
      const usuario = await criarUsuario.execute(req.body);
      return res.status(201).json(usuario);
    } catch (error) {
      return next(error);
    }
  }

  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const q = req.query;
      const filtros: FiltrosUsuario = {
        nome: q.nome as string | undefined,
        documento: q.documento as string | undefined,
        cep: q.cep as string | undefined,
        logradouro: q.logradouro as string | undefined,
        bairro: q.bairro as string | undefined,
        cidade: q.cidade as string | undefined,
        uf: q.uf as string | undefined,
        email: q.email as string | undefined,
        celular: q.celular as string | undefined,
      };

      const resultado = await listarUsuarios.execute({
        filtros,
        busca: q.busca as string | undefined,
        orderBy: q.orderBy as string | undefined,
        orderDir: q.orderDir as string | undefined,
        page: q.page ? Number(q.page) : undefined,
        pageSize: q.pageSize ? Number(q.pageSize) : undefined,
      });

      return res.json(resultado);
    } catch (error) {
      return next(error);
    }
  }
}
