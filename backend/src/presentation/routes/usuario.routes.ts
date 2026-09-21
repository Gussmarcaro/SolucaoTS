import { Router } from 'express';
import { UsuarioController } from '@/presentation/controllers/UsuarioController';
import { uploadFoto } from '@/infrastructure/upload/upload';

const usuarioRoutes = Router();
const controller = new UsuarioController();

usuarioRoutes.post('/', (req, res, next) => controller.criar(req, res, next));
usuarioRoutes.get('/', (req, res, next) => controller.listar(req, res, next));
usuarioRoutes.get('/:id', (req, res, next) => controller.buscar(req, res, next));
usuarioRoutes.put('/:id', (req, res, next) => controller.atualizar(req, res, next));
usuarioRoutes.patch('/:id/status', (req, res, next) => controller.definirAtivo(req, res, next));

// Trocar a foto **de outra pessoa** é administrar usuários, e fica sob o
// mesmo gate do resto. Trocar a própria é outra coisa: vai por `/perfil/foto`,
// sem exigir permissão, como já acontece com o cadastro do próprio usuário.
//
// A **leitura** da foto não está aqui, e não é descuido: ela é montada fora
// deste router, antes do gate. Ver `routes/index.ts`.
usuarioRoutes.post('/:id/foto', uploadFoto, (req, res, next) => controller.enviarFoto(req, res, next));
usuarioRoutes.delete('/:id/foto', (req, res, next) => controller.removerFoto(req, res, next));

export { usuarioRoutes };
