import { Router } from 'express';
import { AuditoriaController } from '@/presentation/controllers/AuditoriaController';

const auditoriaRoutes = Router();
const c = new AuditoriaController();

// Só leitura: a trilha é append-only, alimentada pela camada de dados.
auditoriaRoutes.get('/', (req, res, next) => c.listar(req, res, next));
auditoriaRoutes.get('/entidades', (req, res, next) => c.entidades(req, res, next));
auditoriaRoutes.get('/:entidade/:registroId', (req, res, next) => c.historico(req, res, next));

export { auditoriaRoutes };
