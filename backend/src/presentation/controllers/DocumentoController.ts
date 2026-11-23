import type { Request, Response, NextFunction } from 'express';
import { DocumentoUseCases } from '@/application/documento/DocumentoUseCases';
import { PrismaDocumentoRepository } from '@/infrastructure/database/PrismaDocumentoRepository';

const casos = new DocumentoUseCases(new PrismaDocumentoRepository());

/**
 * Os anexos oficiais do TCESP, preenchidos com o cadastro.
 *
 * Devolve **JSON**, não PDF: o projeto não tem gerador de PDF, e a impressão é
 * do navegador — o mesmo caminho do Espelho e dos relatórios. A vantagem não é
 * só evitar uma dependência: a folha em JSON leva junto a lista do que falta
 * cadastrar, que um PDF não saberia mostrar em destaque.
 *
 * Cada rota mora na família a que o documento pertence, e não numa família
 * `/documentos` própria — é assim que a permissão sai certa sem inventar
 * recurso novo: o Termo de Ciência é do ajuste (`CADASTRO_AJUSTES`), o Termo de
 * Consentimento é do órgão (`CONFIG_ORGAOS`).
 */
export class DocumentoController {
  /** ANEXO PC-02 — Termo de Consentimento (contas bancárias). */
  async termoConsentimento(_req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.termoConsentimento());
    } catch (e) {
      return next(e);
    }
  }

  /**
   * ANEXO RP-05/07/09/11 — Termo de Ciência e de Notificação.
   *
   * `?prestacaoId=` troca o cabeçalho para a versão que instrui prestação de
   * contas (valor repassado e exercício). Sem ele sai a da formalização.
   */
  async termoCiencia(req: Request, res: Response, next: NextFunction) {
    try {
      const prestacaoId = (req.query.prestacaoId as string | undefined) || undefined;
      return res.json(await casos.termoCiencia(req.params.id, prestacaoId));
    } catch (e) {
      return next(e);
    }
  }
}
