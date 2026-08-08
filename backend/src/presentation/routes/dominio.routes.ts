import { Router } from 'express';
import { DominioController } from '@/presentation/controllers/DominioController';

const dominioRoutes = Router();
const c = new DominioController();

// Tabelas de domínio oficiais — somente leitura (carga via seed).
dominioRoutes.get('/cbo', (req, res, next) => c.buscarCbos(req, res, next));
dominioRoutes.get('/cbo/:codigo', (req, res, next) => c.obterCbo(req, res, next));
dominioRoutes.get('/classificacao-economica', (req, res, next) => c.buscarClassificacoes(req, res, next));
dominioRoutes.get('/classificacao-economica/exercicios', (req, res, next) => c.exercicios(req, res, next));
dominioRoutes.get('/classificacao-economica/:codigo', (req, res, next) => c.obterClassificacao(req, res, next));
dominioRoutes.get('/componentes-despesa', (req, res, next) => c.listarComponentes(req, res, next));

export { dominioRoutes };
