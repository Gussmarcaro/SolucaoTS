import rateLimit, { type Options } from 'express-rate-limit';

/**
 * Limites de taxa das rotas públicas.
 *
 * `/auth/*` é a única família que responde **antes** da autenticação, e por
 * isso é a única porta que um estranho pode empurrar. Sem limite, tentar dez
 * mil senhas custa o mesmo que tentar uma.
 *
 * O `LoginUseCase` já iguala o tempo de resposta quando o e-mail não existe
 * (para não vazar quais contas existem), mas isso não atrapalha quem tem
 * paciência. O que atrapalha é o relógio.
 */

/** Formato de erro igual ao do `errorHandler` — o front já sabe lê-lo. */
function resposta(message: string): Partial<Options> {
  return {
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ code: 'MUITAS_TENTATIVAS', message }),
  };
}

/**
 * Login: 10 **falhas** por IP a cada 15 minutos.
 *
 * `skipSuccessfulRequests` é o detalhe que torna o limite indolor: quem acerta
 * a senha nunca gasta cota, então um escritório inteiro atrás do mesmo IP
 * continua entrando normalmente o dia todo. Só erro consome.
 *
 * A contagem é por **IP, não por e-mail**, de propósito. Limitar por conta
 * deixaria qualquer um trancar a conta de qualquer outro só errando a senha
 * dele — trocaria força bruta por negação de serviço dirigida.
 */
export const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  ...resposta('Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.'),
});

/**
 * Recuperação de senha: 5 pedidos por IP por hora.
 *
 * Aqui o alvo não é a senha, é a caixa de entrada de outra pessoa: sem limite,
 * a rota vira uma máquina de enviar e-mail para quem o atacante quiser. Conta
 * tentativa bem-sucedida também, porque é justamente o sucesso que dispara o
 * e-mail.
 */
export const limiteRecuperacao = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  ...resposta('Muitos pedidos de recuperação. Aguarde um pouco antes de tentar de novo.'),
});

/**
 * Teto geral da API, folgado.
 *
 * Não é contra ataque — é contra o laço acidental: uma tela que entra em
 * re-render infinito e dispara mil requisições por minuto derruba o banco de
 * todos os órgãos. 300 por minuto está muito acima do uso humano e muito
 * abaixo do que um `useEffect` mal escrito consegue produzir.
 */
export const limiteGeral = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  // O healthcheck do Render bate de minuto em minuto e não pode ser barrado.
  skip: (req) => req.path === '/health',
  ...resposta('Muitas requisições em pouco tempo. Aguarde um instante.'),
});
