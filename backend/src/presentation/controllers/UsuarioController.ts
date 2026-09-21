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

  // ---- Foto ----

  /** Grava (ou substitui) a foto. Multipart, campo "arquivo". */
  async enviarFoto(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      if (!file) throw new BusinessError('Selecione a imagem.');
      return res.json(
        await gerenciarUsuario.salvarFoto(req.params.id, {
          conteudo: file.buffer,
          tipo: file.mimetype,
        }),
      );
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Devolve a imagem.
   *
   * É a rota mais chamada do sistema depois que o avatar aparece na barra: ela
   * é pedida em toda navegação. Por isso o cache é parte da funcionalidade, e
   * não um refinamento.
   *
   * `ETag` é o carimbo de quando a foto mudou. O navegador devolve o valor em
   * `If-None-Match` e recebe **304 sem corpo** enquanto a foto for a mesma —
   * alguns bytes em vez de dezenas de KB. `private` no `Cache-Control` impede
   * que um proxy compartilhado guarde a foto de uma pessoa e a sirva a outra.
   */
  async baixarFoto(req: Request, res: Response, next: NextFunction) {
    try {
      const foto = await gerenciarUsuario.obterFoto(req.params.id);
      const etag = `"${foto.versao}"`;

      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
      if (req.headers['if-none-match'] === etag) return res.status(304).end();

      res.setHeader('Content-Type', foto.tipo);
      res.setHeader('Content-Length', foto.conteudo.length);
      return res.end(foto.conteudo);
    } catch (error) {
      return next(error);
    }
  }

  async removerFoto(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await gerenciarUsuario.removerFoto(req.params.id));
    } catch (error) {
      return next(error);
    }
  }
}
