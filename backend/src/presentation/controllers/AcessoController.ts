import type { Request, Response, NextFunction } from 'express';
import { ConsultarAcessosUseCase } from '@/application/sessao/ConsultarAcessosUseCase';
import { PrismaSessaoRepository } from '@/infrastructure/database/PrismaSessaoRepository';
import { situacaoDaSessao, tempoDePermanencia } from '@/core/sessao/Sessao';

const casos = new ConsultarAcessosUseCase(new PrismaSessaoRepository());

const texto = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

export class AcessoController {
  /**
   * Histórico de acessos do órgão.
   *
   * A situação e o tempo de permanência são calculados **aqui**, na resposta, e
   * não lidos de colunas — a razão está em `core/sessao/Sessao.ts`. Vão junto
   * mesmo sendo deriváveis no cliente porque o cálculo depende do relógio, e o
   * do servidor é o único que todos compartilham: com o do navegador adiantado,
   * uma sessão que acabou de nascer apareceria abandonada.
   */
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const q = req.query;
      const r = await casos.listar({
        usuarioId: texto(q.usuarioId),
        situacao: texto(q.situacao),
        de: texto(q.de),
        ate: texto(q.ate),
        ordenarPor: texto(q.ordenarPor),
        ordem: texto(q.ordem),
        page: q.page ? Number(q.page) : undefined,
        pageSize: q.pageSize ? Number(q.pageSize) : undefined,
      });

      const agora = new Date();
      return res.json({
        ...r,
        data: r.data.map((s) => ({
          ...s,
          situacao: situacaoDaSessao(s, agora),
          minutos: tempoDePermanencia(s, agora),
        })),
      });
    } catch (e) {
      return next(e);
    }
  }

  async usuarios(_req: Request, res: Response, next: NextFunction) {
    try {
      return res.json({ itens: await casos.usuarios() });
    } catch (e) {
      return next(e);
    }
  }
}
