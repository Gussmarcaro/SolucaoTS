import type { NextFunction, Request, Response } from 'express';
import { AppError } from '@/shared/errors';
import { verificarToken } from '@/shared/auth/jwt';
import { comContexto } from '@/shared/contexto';
import { RegistrarAcessoUseCase } from '@/application/sessao/RegistrarAcessoUseCase';
import { PrismaSessaoRepository } from '@/infrastructure/database/PrismaSessaoRepository';

const acessos = new RegistrarAcessoUseCase(new PrismaSessaoRepository());

/** Usuário autenticado, anexado à requisição para uso nos controllers. */
export interface UsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
  /** Nome do grupo de acesso; null em tokens emitidos antes desta versão. */
  grupo: string | null;
  /** Órgão do usuário; null em tokens antigos e antes do backfill. */
  clienteId: string | null;
  /** Equipe do fornecedor — provisiona órgãos e troca de contexto. */
  suporte: boolean;
  /**
   * Sessão de acesso deste token (`SessaoAcesso.id`); null em tokens emitidos
   * antes do histórico de acessos existir.
   */
  sessaoId: string | null;
}

declare module 'express-serve-static-core' {
  interface Request {
    usuario?: UsuarioAutenticado;
  }
}

/**
 * Exige um JWT válido e abre o contexto da requisição.
 *
 * O `next()` roda **dentro** do contexto, para que tudo que a requisição
 * dispara — inclusive a extension de auditoria, lá na camada de dados —
 * enxergue quem está operando.
 */
export function autenticar(req: Request, _res: Response, next: NextFunction) {
  const cabecalho = req.header('authorization') ?? '';
  const token = /^Bearer\s+(.+)$/i.exec(cabecalho)?.[1]?.trim();

  if (!token) {
    return next(new AppError('Autenticação necessária.', 401, 'NAO_AUTENTICADO'));
  }

  let payload;
  try {
    payload = verificarToken(token);
  } catch {
    // Token adulterado ou expirado — o front trata 401 redirecionando ao login.
    return next(new AppError('Sessão expirada ou inválida. Entre novamente.', 401, 'NAO_AUTENTICADO'));
  }

  req.usuario = {
    id: payload.sub,
    nome: payload.nome,
    email: payload.email,
    grupo: payload.grupo ?? null,
    clienteId: payload.cli ?? null,
    suporte: payload.sup === true,
    sessaoId: payload.jti ?? null,
  };

  comContexto(
    {
      usuarioId: payload.sub,
      usuarioNome: payload.nome,
      rota: `${req.method} ${req.baseUrl}${req.path}`,
      clienteId: payload.cli ?? null,
    },
    () => {
      /*
       * O terceiro sinal do histórico de acessos: "esta sessão continua viva".
       *
       * É daqui que ele sai porque este middleware vê **toda** requisição
       * autenticada — e sem ele o histórico só saberia quando alguém entrou,
       * nunca até quando ficou. Fechar a aba, perder a conexão e desligar a
       * máquina não mandam evento nenhum ao servidor.
       *
       * **Sem `await`, e sem `catch` aqui**: o carimbo não pode atrasar a
       * requisição nem derrubá-la. Quem engole a falha (e limita a uma escrita
       * por minuto) é o caso de uso.
       */
      void acessos.tocar(payload.jti);
      next();
    },
  );
}
