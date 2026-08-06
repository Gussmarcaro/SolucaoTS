import type { Request, Response, NextFunction } from 'express';
import { CriarUsuarioUseCase } from '@/application/usuario/CriarUsuarioUseCase';
import { AtualizarUsuarioUseCase } from '@/application/usuario/AtualizarUsuarioUseCase';
import { ListarUsuariosUseCase } from '@/application/usuario/ListarUsuariosUseCase';
import { GerenciarUsuarioUseCase } from '@/application/usuario/GerenciarUsuarioUseCase';
import { PrismaUsuarioRepository } from '@/infrastructure/database/PrismaUsuarioRepository';
import { PrismaGrupoRepository } from '@/infrastructure/database/PrismaGrupoRepository';
import { BusinessError, NotFoundError } from '@/shared/errors';
import type { FiltrosUsuario } from '@/application/usuario/dtos';

const repo = new PrismaUsuarioRepository();
const grupoRepo = new PrismaGrupoRepository();
const criarUsuario = new CriarUsuarioUseCase(repo, grupoRepo);
const atualizarUsuario = new AtualizarUsuarioUseCase(repo, grupoRepo);
const listarUsuarios = new ListarUsuariosUseCase(repo);
const gerenciarUsuario = new GerenciarUsuarioUseCase(repo);

function parseAtivo(v: unknown): boolean | undefined {
  if (v === 'true' || v === true) return true;
  if (v === 'false' || v === false) return false;
  return undefined;
}

export class UsuarioController {
  async criar(req: Request, res: Response, next: NextFunction) {
    try {
      const usuario = await criarUsuario.execute(req.body);
      return res.status(201).json(usuario);
    } catch (error) {
      return next(error);
    }
  }

  async buscar(req: Request, res: Response, next: NextFunction) {
    try {
      const usuario = await repo.buscarPorId(req.params.id);
      if (!usuario) throw new NotFoundError('Usuário não encontrado.');
      return res.json(usuario);
    } catch (error) {
      return next(error);
    }
  }

  async atualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const usuario = await atualizarUsuario.execute(req.params.id, req.body);
      return res.json(usuario);
    } catch (error) {
      return next(error);
    }
  }

  /** Ativa/inativa (soft delete). Body: { ativo: boolean }. */
  async definirAtivo(req: Request, res: Response, next: NextFunction) {
    try {
      const ativo = parseAtivo(req.body?.ativo);
      if (ativo === undefined) throw new BusinessError('Informe o campo "ativo" (true/false).');
      const usuario = await gerenciarUsuario.definirAtivo(req.params.id, ativo);
      return res.json(usuario);
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
        ativo: parseAtivo(q.ativo),
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
