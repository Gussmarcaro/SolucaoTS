import type { Request, Response, NextFunction } from 'express';
import { BuscarGlobalUseCase } from '@/application/busca/BuscarGlobalUseCase';
import { PrismaAjusteRepository } from '@/infrastructure/database/PrismaAjusteRepository';
import { PrismaPrestacaoRepository } from '@/infrastructure/database/PrismaPrestacaoRepository';
import { PrismaEntidadeRepository } from '@/infrastructure/database/PrismaEntidadeRepository';
import { PrismaFornecedorRepository } from '@/infrastructure/database/PrismaFornecedorRepository';
import { PrismaColaboradorRepository } from '@/infrastructure/database/PrismaColaboradorRepository';
import { PrismaContratoRepository } from '@/infrastructure/database/PrismaContratoRepository';
import { PrismaBemCedidoRepository } from '@/infrastructure/database/PrismaBemCedidoRepository';
import { PrismaServidorCedidoRepository } from '@/infrastructure/database/PrismaServidorCedidoRepository';
import { PrismaClienteRepository } from '@/infrastructure/database/PrismaClienteRepository';

const buscar = new BuscarGlobalUseCase({
  ajustes: new PrismaAjusteRepository(),
  prestacoes: new PrismaPrestacaoRepository(),
  entidades: new PrismaEntidadeRepository(),
  fornecedores: new PrismaFornecedorRepository(),
  colaboradores: new PrismaColaboradorRepository(),
  contratos: new PrismaContratoRepository(),
  bens: new PrismaBemCedidoRepository(),
  servidores: new PrismaServidorCedidoRepository(),
  orgaos: new PrismaClienteRepository(),
});

export class BuscaController {
  /** `GET /busca?q=termo` — resultados de todos os cadastros, em uma lista. */
  async buscar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await buscar.execute(String(req.query.q ?? '')));
    } catch (e) {
      return next(e);
    }
  }
}
