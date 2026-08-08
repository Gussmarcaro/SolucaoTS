import express from 'express';
import cors from 'cors';
import { routes } from '@/presentation/routes';
import { errorHandler } from '@/presentation/middlewares/errorHandler';

export const app = express();

// Em produção, defina CORS_ORIGIN com a URL do frontend (ex.: https://app.vercel.app).
// Sem a variável, libera todas as origens (útil em desenvolvimento).
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : '*';

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.use('/api', routes);
app.use(errorHandler);
