import type { Request, Response, NextFunction } from 'express';
import { CriarEmpresaUseCase } from '@/application/empresa/CriarEmpresaUseCase';
import { AtualizarEmpresaUseCase } from '@/application/empresa/AtualizarEmpresaUseCase';
import { ListarEmpresasUseCase } from '@/application/empresa/ListarEmpresasUseCase';
import { GerenciarEmpresaUseCase } from '@/application/empresa/GerenciarEmpresaUseCase';
import { PrismaEmpresaRepository } from '@/infrastructure/database/PrismaEmpresaRepository';
import { urlPublicaLogo } from '@/infrastructure/upload/upload';
import { BusinessError } from '@/shared/errors';
import type { FiltrosEmpresa } from '@/application/empresa/dtos';

const repo = new PrismaEmpresaRepository();
const criar = new CriarEmpresaUseCase(repo);
const atualizar = new AtualizarEmpresaUseCase(repo);
const listar = new ListarEmpresasUseCase(repo);
const gerenciar = new GerenciarEmpresaUseCase(repo);

function parseAtivo(v: unknown): boolean | undefined {
  if (v === 'true' || v === true) return true;
  if (v === 'false' || v === false) return false;
  return undefined;
}

export class EmpresaController {
  async criar(req: Request, res: Response, next: NextFunction) {
    try {
      const empresa = await criar.execute(req.body);
      return res.status(201).json(empresa);
    } catch (e) {
      return next(e);
    }
  }

  async atualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const empresa = await atualizar.execute(req.params.id, req.body);
      return res.json(empresa);
    } catch (e) {
      return next(e);
    }
  }

  async buscar(req: Request, res: Response, next: NextFunction) {
    try {
      const empresa = await gerenciar.buscar(req.params.id);
      return res.json(empresa);
    } catch (e) {
      return next(e);
    }
  }

  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const q = req.query;
      const filtros: FiltrosEmpresa = {
        razaoSocial: q.razaoSocial as string | undefined,
        nomeFantasia: q.nomeFantasia as string | undefined,
        cnpj: q.cnpj as string | undefined,
        cidade: q.cidade as string | undefined,
        uf: q.uf as string | undefined,
        ativo: parseAtivo(q.ativo),
      };
      const resultado = await listar.execute({
        filtros,
        page: q.page ? Number(q.page) : undefined,
        pageSize: q.pageSize ? Number(q.pageSize) : undefined,
      });
      return res.json(resultado);
    } catch (e) {
      return next(e);
    }
  }

  /** Soft delete / reativação. Body: { ativo: boolean }. */
  async definirAtivo(req: Request, res: Response, next: NextFunction) {
    try {
      const ativo = parseAtivo(req.body?.ativo);
      if (ativo === undefined) throw new BusinessError('Informe o campo "ativo" (true/false).');
      const empresa = await gerenciar.definirAtivo(req.params.id, ativo);
      return res.json(empresa);
    } catch (e) {
      return next(e);
    }
  }

  /** Upload do logotipo (multipart, campo "file"). Retorna { logoUrl }. */
  async uploadLogo(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new BusinessError('Nenhum arquivo enviado.');
      const logoUrl = urlPublicaLogo(req.file.filename);
      // Se veio associado a uma empresa, grava a URL nela.
      if (req.params.id) {
        const empresa = await gerenciar.atualizarLogo(req.params.id, logoUrl);
        return res.json({ logoUrl, empresa });
      }
      return res.status(201).json({ logoUrl });
    } catch (e) {
      return next(e);
    }
  }
}
