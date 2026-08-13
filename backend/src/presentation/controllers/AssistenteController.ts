import type { Request, Response, NextFunction } from 'express';
import { ResponderAssistenteUseCase } from '@/application/assistente/ResponderAssistenteUseCase';
import { ClaudeAssistente } from '@/infrastructure/assistente/ClaudeAssistente';

const provider = new ClaudeAssistente();
const responder = new ResponderAssistenteUseCase(provider);

/** Um evento SSE. `\n\n` fecha o evento; o JSON protege quebras de linha do texto. */
function enviar(res: Response, tipo: string, dados: unknown): void {
  res.write(`event: ${tipo}\ndata: ${JSON.stringify(dados)}\n\n`);
}

export class AssistenteController {
  /** `GET /assistente/status` — a tela some quando o assistente não está configurado. */
  async status(_req: Request, res: Response) {
    return res.json({ disponivel: provider.disponivel });
  }

  /**
   * `POST /assistente` — responde em streaming (SSE).
   *
   * O erro precisa de dois caminhos: antes do primeiro byte ainda dá para
   * devolver um status HTTP e deixar o middleware de erro tratar; depois que o
   * cabeçalho SSE foi escrito, o status já foi para o cliente — aí o erro vira
   * um evento no próprio fluxo, senão a tela fica esperando para sempre.
   */
  async responder(req: Request, res: Response, next: NextFunction) {
    let abriu = false;
    try {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      // Desliga o buffer de proxies: com ele, o texto chega todo de uma vez no
      // fim e o streaming não serve para nada.
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders?.();
      abriu = true;

      await responder.execute(req.body?.mensagens, (trecho) => enviar(res, 'trecho', trecho));

      enviar(res, 'fim', {});
      return res.end();
    } catch (e) {
      if (!abriu) return next(e);
      const erro = e as { message?: string };
      enviar(res, 'erro', erro?.message ?? 'Falha ao responder.');
      return res.end();
    }
  }
}
