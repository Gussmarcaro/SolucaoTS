import { Router } from 'express';
import { AuthController } from '@/presentation/controllers/AuthController';
import { limiteLogin, limiteRecuperacao } from '@/presentation/middlewares/limites';
import { autenticar } from '@/presentation/middlewares/autenticar';

const authRoutes = Router();
const c = new AuthController();

// A única família que responde antes da autenticação — e por isso a única que
// um estranho consegue empurrar. Os limites estão em `limites.ts`.
authRoutes.post('/login', limiteLogin, (req, res, next) => c.login(req, res, next));
authRoutes.post('/esqueci-senha', limiteRecuperacao, (req, res, next) =>
  c.solicitarRecuperacao(req, res, next),
);
// Redefinir consome um token de uso único que já expira; o limite aqui é
// contra quem tentaria adivinhá-lo por repetição.
authRoutes.post('/redefinir-senha', limiteRecuperacao, (req, res, next) =>
  c.redefinirSenha(req, res, next),
);

/**
 * Sair. **A única rota desta família que exige autenticação** — e precisa
 * exigir: sem o token não há como saber qual sessão fechar, e aceitar um id de
 * sessão pelo corpo deixaria qualquer um encerrar a sessão alheia no histórico.
 *
 * Fica fora do `exigirPermissao` junto com o resto de `/auth`: sair não é uma
 * operação que a matriz de permissões possa recusar a alguém.
 */
authRoutes.post('/logout', autenticar, (req, res, next) => c.logout(req, res, next));

export { authRoutes };
