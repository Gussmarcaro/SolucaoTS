import type { Request, Response, NextFunction } from 'express';
import { LoginUseCase } from '@/application/auth/LoginUseCase';
import { SolicitarRecuperacaoUseCase } from '@/application/auth/SolicitarRecuperacaoUseCase';
import { RedefinirSenhaUseCase } from '@/application/auth/RedefinirSenhaUseCase';
import { PrismaUsuarioRepository } from '@/infrastructure/database/PrismaUsuarioRepository';
import { ConsoleEmailService } from '@/infrastructure/email/ConsoleEmailService';

const repo = new PrismaUsuarioRepository();
const emailService = new ConsoleEmailService();
const login = new LoginUseCase(repo);
const solicitar = new SolicitarRecuperacaoUseCase(repo, emailService);
const redefinir = new RedefinirSenhaUseCase(repo);

const MSG_RECUPERACAO_GENERICA =
  'Se o e-mail informado estiver em nossa base, você receberá as instruções para redefinição de senha em breve.';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const resultado = await login.execute(req.body);
      return res.json(resultado);
    } catch (e) {
      return next(e);
    }
  }

  /** Sempre responde a mesma mensagem (não revela se o e-mail existe). */
  async solicitarRecuperacao(req: Request, res: Response, next: NextFunction) {
    try {
      await solicitar.execute(req.body);
      return res.json({ message: MSG_RECUPERACAO_GENERICA });
    } catch (e) {
      return next(e);
    }
  }

  async redefinirSenha(req: Request, res: Response, next: NextFunction) {
    try {
      await redefinir.execute(req.body);
      return res.json({ message: 'Senha redefinida com sucesso. Você já pode fazer login.' });
    } catch (e) {
      return next(e);
    }
  }
}
