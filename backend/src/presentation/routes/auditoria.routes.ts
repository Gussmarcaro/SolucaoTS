import { Router } from 'express';
import { AuditoriaController } from '@/presentation/controllers/AuditoriaController';
import { exigirGrupo } from '@/presentation/middlewares/exigirGrupo';

const auditoriaRoutes = Router();
const c = new AuditoriaController();

// A trilha expõe dados de todos os cadastros — restrita a quem administra o
// sistema. Esconder o menu não basta: sem isto, bastaria chamar a rota.
auditoriaRoutes.use(exigirGrupo('Administrador', 'Suporte'));

// Só leitura: a trilha é append-only, alimentada pela camada de dados.
auditoriaRoutes.get('/', (req, res, next) => c.listar(req, res, next));
auditoriaRoutes.get('/entidades', (req, res, next) => c.entidades(req, res, next));
auditoriaRoutes.get('/:entidade/:registroId', (req, res, next) => c.historico(req, res, next));

export { auditoriaRoutes };
