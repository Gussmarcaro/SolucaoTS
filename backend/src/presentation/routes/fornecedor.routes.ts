import { Router } from 'express';
import { FornecedorController } from '@/presentation/controllers/FornecedorController';

const fornecedorRoutes = Router();
const c = new FornecedorController();

fornecedorRoutes.get('/', (req, res, next) => c.listar(req, res, next));
fornecedorRoutes.post('/', (req, res, next) => c.criar(req, res, next));
fornecedorRoutes.get('/:id', (req, res, next) => c.buscar(req, res, next));
fornecedorRoutes.put('/:id', (req, res, next) => c.atualizar(req, res, next));
fornecedorRoutes.patch('/:id/status', (req, res, next) => c.definirAtivo(req, res, next));
/*
 * O nome do fornecedor nas notas e contratos. GET consulta, POST grava — a
 * permissão sai do método, como no resto: levar o nome às cópias é editar o
 * fornecedor, e por isso pede Edição em Fornecedores.
 */
fornecedorRoutes.get('/:id/nome-nas-copias', (req, res, next) => c.levantarNome(req, res, next));
fornecedorRoutes.post('/:id/nome-nas-copias', (req, res, next) => c.propagarNome(req, res, next));

export { fornecedorRoutes };
