import type { Request, Response, NextFunction } from 'express';
import { ConsultarDominiosUseCase } from '@/application/dominio/ConsultarDominiosUseCase';
import { PrismaDominioRepository } from '@/infrastructure/database/PrismaDominioRepository';
import { ehMedico } from '@/core/dominio/Dominio';

const consultar = new ConsultarDominiosUseCase(new PrismaDominioRepository());

const numero = (v: unknown): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export class DominioController {
  async buscarCbos(req: Request, res: Response, next: NextFunction) {
    try {
      const itens = await consultar.buscarCbos({
        busca: req.query.busca as string | undefined,
        limite: numero(req.query.limite),
      });
      return res.json({ itens: itens.map((c) => ({ ...c, medico: ehMedico(c.codigo) })) });
    } catch (e) {
      return next(e);
    }
  }

  async obterCbo(req: Request, res: Response, next: NextFunction) {
    try {
      const cbo = await consultar.obterCbo(req.params.codigo);
      if (!cbo) return res.status(404).json({ message: 'CBO não encontrado.' });
      return res.json({ ...cbo, medico: ehMedico(cbo.codigo) });
    } catch (e) {
      return next(e);
    }
  }

  async buscarClassificacoes(req: Request, res: Response, next: NextFunction) {
    try {
      const itens = await consultar.buscarClassificacoes({
        busca: req.query.busca as string | undefined,
        exercicio: numero(req.query.exercicio),
        ente: req.query.ente as string | undefined,
        limite: numero(req.query.limite),
      });
      return res.json({ itens });
    } catch (e) {
      return next(e);
    }
  }

  async obterClassificacao(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await consultar.obterClassificacao(req.params.codigo, numero(req.query.exercicio));
      if (!item) return res.status(404).json({ message: 'Classificação econômica não encontrada.' });
      return res.json(item);
    } catch (e) {
      return next(e);
    }
  }

  async listarComponentes(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json({ itens: await consultar.listarComponentes(req.query.tipo as string | undefined) });
    } catch (e) {
      return next(e);
    }
  }

  async exercicios(_req: Request, res: Response, next: NextFunction) {
    try {
      return res.json({ itens: await consultar.exerciciosDisponiveis() });
    } catch (e) {
      return next(e);
    }
  }
}
