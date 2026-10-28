import type { Request, Response, NextFunction } from 'express';
import { ConciliacaoUseCases } from '@/application/conciliacao/ConciliacaoUseCases';
import { PrismaConciliacaoRepository } from '@/infrastructure/database/PrismaConciliacaoRepository';
import { BusinessError } from '@/shared/errors';

const casos = new ConciliacaoUseCases(new PrismaConciliacaoRepository());

export class ConciliacaoController {
  async importar(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new BusinessError('Selecione o arquivo OFX do extrato.');
      return res.json(await casos.importar(req.file.buffer));
    } catch (e) {
      return next(e);
    }
  }

  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(
        await casos.listar({
          de: req.query.de as string | undefined,
          ate: req.query.ate as string | undefined,
          // Dentro de um ajuste, só as linhas das contas dele.
          ajusteId: (req.query.ajusteId as string | undefined) || undefined,
        }),
      );
    } catch (e) {
      return next(e);
    }
  }

  /**
   * De quais contas é o extrato importado — para a tela explicar lista vazia.
   *
   * **Sem `ajusteId`, de propósito.** A pergunta existe justamente quando o
   * recorte por ajuste escondeu tudo: recortá-la também devolveria o mesmo
   * nada, e a tela continuaria sem o que dizer.
   */
  async contasDoExtrato(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(
        await casos.contasDoExtrato({
          de: req.query.de as string | undefined,
          ate: req.query.ate as string | undefined,
        }),
      );
    } catch (e) {
      return next(e);
    }
  }

  /**
   * Os lançamentos que ainda não apareceram no extrato.
   *
   * Exige o período, e não o assume: sem `de`/`ate` a consulta varreria todos
   * os pagamentos do órgão desde sempre para responder a uma pergunta que é do
   * mês corrente. A tela já tem os dois campos.
   */
  async pendentes(req: Request, res: Response, next: NextFunction) {
    try {
      const de = req.query.de as string | undefined;
      const ate = req.query.ate as string | undefined;
      if (!de || !ate)
        throw new BusinessError('Informe o período (de/até) para listar os lançamentos pendentes.');
      const ajusteId = (req.query.ajusteId as string | undefined) || undefined;
      return res.json(await casos.pendentes({ de, ate, ajusteId }));
    } catch (e) {
      return next(e);
    }
  }

  async conciliar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.conciliar(req.params.id, req.body));
    } catch (e) {
      return next(e);
    }
  }
}
