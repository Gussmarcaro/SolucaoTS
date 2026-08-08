import type { Request, Response, NextFunction } from 'express';
import { MontarPrestacaoUseCase } from '@/application/montador/MontarPrestacaoUseCase';
import { PrismaMontadorRepository } from '@/infrastructure/database/PrismaMontadorRepository';
import { TcespHttpGateway } from '@/infrastructure/tcesp/TcespHttpGateway';
import { AjvValidadorSchema } from '@/infrastructure/tcesp/AjvValidadorSchema';
import { PrismaTransmissaoRepository } from '@/infrastructure/database/PrismaTransmissaoRepository';
import { TransmitirPrestacaoUseCase } from '@/application/transmissao/TransmitirPrestacaoUseCase';
import { ConsultarStatusUseCase } from '@/application/transmissao/ConsultarStatusUseCase';
import type { Ambiente } from '@/application/transmissao/dtos';

const montador = new MontarPrestacaoUseCase(new PrismaMontadorRepository(), new AjvValidadorSchema());
const gateway = new TcespHttpGateway();
const repo = new PrismaTransmissaoRepository();
const transmitir = new TransmitirPrestacaoUseCase(montador, gateway, repo);
const consultar = new ConsultarStatusUseCase(gateway, repo);

/** Só transmite a PRODUÇÃO com opt-in explícito; qualquer outro valor → PILOTO. */
function ambienteSeguro(v: unknown): Ambiente {
  return v === 'PRODUCAO' ? 'PRODUCAO' : 'PILOTO';
}

export class TransmissaoController {
  async transmitir(req: Request, res: Response, next: NextFunction) {
    try {
      const { ambiente, usuario, senha } = req.body ?? {};
      const resultado = await transmitir.execute(req.params.prestacaoId, ambienteSeguro(ambiente), {
        usuario,
        senha,
      });
      return res.json(resultado);
    } catch (e) {
      return next(e);
    }
  }

  async consultar(req: Request, res: Response, next: NextFunction) {
    try {
      const { ambiente, usuario, senha, protocolo } = req.body ?? {};
      const resultado = await consultar.execute(
        req.params.prestacaoId,
        ambienteSeguro(ambiente),
        { usuario, senha },
        protocolo,
      );
      return res.json(resultado);
    } catch (e) {
      return next(e);
    }
  }
}
