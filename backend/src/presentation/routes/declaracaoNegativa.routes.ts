import { Router } from 'express';
import { DeclaracaoNegativaController } from '@/presentation/controllers/DeclaracaoNegativaController';

const declaracaoNegativaRoutes = Router();
const c = new DeclaracaoNegativaController();

// Negativa do módulo Ajustes: por tipo de ajuste e período, feita na tela do
// Audesp. Aqui ficam a lista do que declarar e o registro do que foi feito.
declaracaoNegativaRoutes.get('/ajustes', (req, res, next) => c.painelAjustes(req, res, next));
declaracaoNegativaRoutes.post('/ajustes', (req, res, next) => c.marcarAjustes(req, res, next));
declaracaoNegativaRoutes.delete('/ajustes/:id', (req, res, next) => c.desmarcarAjuste(req, res, next));

// Negativa da prestação de contas: por ajuste e exercício, enviada como JSON.
// A criação e o envio usam as rotas da prestação; aqui fica só a sugestão.
declaracaoNegativaRoutes.get('/prestacao', (req, res, next) => c.painelPrestacao(req, res, next));

export { declaracaoNegativaRoutes };
