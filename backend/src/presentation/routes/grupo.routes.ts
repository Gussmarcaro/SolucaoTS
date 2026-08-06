import { Router } from 'express';
import { GrupoController } from '@/presentation/controllers/GrupoController';

const grupoRoutes = Router();
const c = new GrupoController();

grupoRoutes.get('/', (req, res, next) => c.listar(req, res, next));
grupoRoutes.get('/ativos', (req, res, next) => c.listarAtivos(req, res, next)); // antes de /:id
grupoRoutes.post('/', (req, res, next) => c.criar(req, res, next));
grupoRoutes.get('/:id', (req, res, next) => c.buscar(req, res, next));
grupoRoutes.put('/:id', (req, res, next) => c.atualizar(req, res, next));
grupoRoutes.patch('/:id/status', (req, res, next) => c.definirAtivo(req, res, next));
grupoRoutes.delete('/:id', (req, res, next) => c.excluir(req, res, next));

export { grupoRoutes };
