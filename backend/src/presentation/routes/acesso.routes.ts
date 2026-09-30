import { Router } from 'express';
import { AcessoController } from '@/presentation/controllers/AcessoController';
import { exigirGrupo } from '@/presentation/middlewares/exigirGrupo';

const acessoRoutes = Router();
const c = new AcessoController();

// O histórico diz quem entrou no sistema, de onde e em que navegador — dado
// pessoal de todo mundo do órgão. Restrito a quem administra, como a trilha de
// auditoria. Esconder o menu não basta: sem isto, bastaria chamar a rota.
acessoRoutes.use(exigirGrupo('Administrador', 'Suporte'));

// Só leitura, e é a regra do módulo: o histórico é append-only, alimentado pelo
// login e pelo middleware de autenticação. Não existe POST, PUT nem DELETE aqui
// de propósito — um histórico que a tela pode corrigir não é histórico.
acessoRoutes.get('/', (req, res, next) => c.listar(req, res, next));
acessoRoutes.get('/usuarios', (req, res, next) => c.usuarios(req, res, next));

export { acessoRoutes };
