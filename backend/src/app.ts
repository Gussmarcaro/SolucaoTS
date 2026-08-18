import express from 'express';
import cors from 'cors';
import { routes } from '@/presentation/routes';
import { errorHandler } from '@/presentation/middlewares/errorHandler';
import { limiteGeral } from '@/presentation/middlewares/limites';
import { registrarRequisicao } from '@/presentation/middlewares/registrarRequisicao';

export const app = express();

/*
 * Confiança no proxy — precisa vir antes de qualquer limite de taxa.
 *
 * Em produção a aplicação fica atrás do proxy da hospedagem, e sem isto o
 * `req.ip` de **todo mundo** é o mesmo (o do proxy): as dez primeiras senhas
 * erradas do sistema inteiro trancariam todos os usuários de todos os órgãos.
 *
 * Confiamos em **um salto**, não em `true`. Confiar em todos deixaria qualquer
 * um forjar o `X-Forwarded-For` e escapar do limite inventando um IP novo a
 * cada tentativa — o que devolveria o problema que o limite existe para tratar.
 */
app.set('trust proxy', process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) : process.env.NODE_ENV === 'production' ? 1 : false);

// Em produção, defina CORS_ORIGIN com a URL do frontend (ex.: https://app.vercel.app).
// Sem a variável, libera todas as origens (útil em desenvolvimento).
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : '*';

// Primeiro de todos: carimba o id da requisição e mede a duração, para que
// até o que for recusado pelo CORS ou pelo limite de taxa apareça no log.
app.use(registrarRequisicao);
app.use(cors({ origin: corsOrigin }));
app.use(express.json());
app.use(limiteGeral);

app.use('/api', routes);
app.use(errorHandler);
