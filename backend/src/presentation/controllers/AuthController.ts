import type { Request, Response, NextFunction } from 'express';
import { LoginUseCase } from '@/application/auth/LoginUseCase';
import { SolicitarRecuperacaoUseCase } from '@/application/auth/SolicitarRecuperacaoUseCase';
import { RedefinirSenhaUseCase } from '@/application/auth/RedefinirSenhaUseCase';
import { PrismaUsuarioRepository } from '@/infrastructure/database/PrismaUsuarioRepository';
import { criarEmailService } from '@/infrastructure/email/criarEmailService';
import { RegistrarAcessoUseCase } from '@/application/sessao/RegistrarAcessoUseCase';
import { PrismaSessaoRepository } from '@/infrastructure/database/PrismaSessaoRepository';

const repo = new PrismaUsuarioRepository();
const emailService = criarEmailService();
const acessos = new RegistrarAcessoUseCase(new PrismaSessaoRepository());
const login = new LoginUseCase(repo, acessos);
const solicitar = new SolicitarRecuperacaoUseCase(repo, emailService);
const redefinir = new RedefinirSenhaUseCase(repo);

/** Teto do User-Agent guardado. O que interessa (navegador e sistema) vem no
 * começo da cadeia; o resto é enfeite que só ocuparia a coluna. */
const MAX_NAVEGADOR = 300;

/**
 * De onde partiu a requisição, para o histórico de acessos.
 *
 * `req.ip` só vale o que `trust proxy` permitir — que já está configurado por
 * causa do limite de tentativas de login. Sem ele, atrás do proxy da
 * hospedagem, todo acesso teria o mesmo endereço.
 */
function origemDa(req: Request) {
  const ip = req.ip ?? null;
  return {
    // `::ffff:200.1.2.3` é o mesmo endereço escrito na forma mapeada do IPv6.
    // Guardar as duas formas do mesmo IP faria a coluna parecer dois acessos
    // diferentes de lugares diferentes.
    ip: ip ? ip.replace(/^::ffff:/, '') : null,
    navegador: req.header('user-agent')?.slice(0, MAX_NAVEGADOR) ?? null,
  };
}

const MSG_RECUPERACAO_GENERICA =
  'Se o e-mail informado estiver em nossa base, você receberá as instruções para redefinição de senha em breve.';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const resultado = await login.execute(req.body, origemDa(req));
      return res.json(resultado);
    } catch (e) {
      return next(e);
    }
  }

  /**
   * Fecha a sessão no servidor.
   *
   * Até aqui o logout era só do navegador — `AuthContext.sair()` limpava o
   * `localStorage` e o servidor nunca ficava sabendo. Com o histórico de
   * acessos isso deixou de bastar: sem este endpoint, **toda** sessão
   * apareceria como encerrada inesperadamente, inclusive a de quem clicou em
   * Sair.
   *
   * **Não invalida o token** — ele continua stateless e válido até expirar.
   * Invalidá-lo exigiria uma lista de revogação consultada a cada requisição,
   * que é outro projeto e outro custo. O que este endpoint registra é o que
   * ele diz registrar: a hora em que a pessoa saiu.
   *
   * Responde 204 sempre, inclusive com token sem sessão: quem está saindo não
   * tem o que fazer com um erro.
   */
  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      await acessos.encerrar(req.usuario?.sessaoId);
      return res.status(204).end();
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
