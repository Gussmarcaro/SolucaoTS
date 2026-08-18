import type { Request, Response, NextFunction } from 'express';
import { SuporteUseCases } from '@/application/suporte/SuporteUseCases';
import { PrismaSuporteRepository } from '@/infrastructure/database/PrismaSuporteRepository';
import { assinarToken } from '@/shared/auth/jwt';
import { hashSenha } from '@/shared/auth/senha';
import { BusinessError } from '@/shared/errors';

const casos = new SuporteUseCases(new PrismaSuporteRepository());

export class SuporteController {
  async orgaos(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.listarOrgaos(req.usuario?.suporte === true));
    } catch (e) {
      return next(e);
    }
  }

  /**
   * Troca o órgão que o suporte está atendendo, devolvendo um token novo.
   *
   * O token é reemitido em vez de o servidor guardar "quem está atendendo o
   * quê": o contexto do atendimento passa a viajar com a credencial, então não
   * há sessão a expirar no servidor nem estado a sincronizar entre instâncias.
   * O grupo é preservado — trocar de órgão não muda o que a pessoa pode fazer.
   */
  async atender(req: Request, res: Response, next: NextFunction) {
    try {
      const clienteId = req.body?.clienteId;
      if (typeof clienteId !== 'string' || !clienteId)
        throw new BusinessError('Informe o órgão a atender.');

      const orgao = await casos.atender(req.usuario?.suporte === true, clienteId);
      const u = req.usuario!;

      const token = assinarToken({
        sub: u.id,
        nome: u.nome,
        email: u.email,
        grupo: u.grupo,
        cli: orgao.id,
        sup: true,
      });

      return res.json({ token, orgao });
    } catch (e) {
      return next(e);
    }
  }

  async provisionar(req: Request, res: Response, next: NextFunction) {
    try {
      const r = await casos.provisionar(req.usuario?.suporte === true, req.body, hashSenha);
      return res.status(201).json(r);
    } catch (e) {
      return next(e);
    }
  }
}
