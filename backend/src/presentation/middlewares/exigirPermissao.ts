import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { AppError } from '@/shared/errors';
import type { AcaoPermissao } from '@/core/permissao/Recurso';
import { RECURSOS_POR_ID } from '@/core/permissao/Recurso';
import { grupoSemPermissoes, permissoesDoGrupo } from '@/infrastructure/database/permissoesCache';

/**
 * Ação exigida por método HTTP.
 *
 * GET lê; DELETE apaga; o resto grava. `POST` cobre criação e as ações de tela
 * (importar CSV, transmitir), e por isso o padrão dele é `CREATE` — quando a
 * rota faz outra coisa, a própria rota declara a ação.
 */
const ACAO_POR_METODO: Record<string, AcaoPermissao> = {
  GET: 'READ',
  HEAD: 'READ',
  POST: 'CREATE',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE',
};

/** Grupos que enxergam os recursos marcados como restritos. */
const GRUPOS_ADMIN = ['administrador', 'suporte'];

const normalizar = (v: string) =>
  v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

/**
 * Ação exigida, quando a rota não quer o padrão do método.
 *
 * Ou uma ação fixa para toda a família, ou um ajuste por método — este último
 * para quando **parte** da família decide no registro concreto o que a matriz
 * não consegue decidir na rota. Hoje é o caso da agenda: excluir o compromisso
 * que você mesmo criou não deveria exigir acesso Total, e "é seu?" é pergunta
 * que só o caso de uso responde, olhando o `criadoPor`.
 */
export type AcaoExigida = AcaoPermissao | Partial<Record<string, AcaoPermissao>>;

/**
 * Exige permissão sobre um recurso.
 *
 * Aplicado por conjunto de rotas; a ação sai do método HTTP, salvo quando a
 * rota declara outra (`acao`). Sem permissão declarada o acesso é **negado** —
 * um recurso esquecido fica trancado, não aberto, que é o único padrão seguro
 * quando a lista pode ficar para trás.
 */
export function exigirPermissao(recursoId: string, acao?: AcaoExigida): RequestHandler {
  const recurso = RECURSOS_POR_ID.get(recursoId);
  if (!recurso) throw new Error(`Recurso desconhecido em exigirPermissao: ${recursoId}`);

  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const grupo = req.usuario?.grupo;
      if (!grupo)
        return next(
          new AppError('Seu usuário não está em nenhum grupo de acesso.', 403, 'SEM_GRUPO'),
        );

      // Grupo ainda não configurado na matriz: acessa tudo, como antes de
      // existir controle de acesso. A verificação é **por grupo** — configurar
      // um grupo não pode trancar os demais, que foi exatamente o efeito da
      // primeira versão desta regra.
      if (await grupoSemPermissoes(grupo)) return next();

      if (recurso.restrito && !GRUPOS_ADMIN.includes(normalizar(grupo)))
        return next(new AppError('Acesso restrito à administração.', 403, 'ACESSO_NEGADO'));

      const padrao = ACAO_POR_METODO[req.method] ?? 'UPDATE';
      const exigida =
        typeof acao === 'string' ? acao : (acao?.[req.method] ?? padrao);
      const concedidas = await permissoesDoGrupo(grupo);

      if (!concedidas.get(recursoId)?.has(exigida))
        return next(
          new AppError(
            `Seu grupo não tem permissão de ${rotuloAcao(exigida)} em ${recurso.rotulo}.`,
            403,
            'ACESSO_NEGADO',
          ),
        );

      return next();
    } catch (e) {
      return next(e);
    }
  };
}

function rotuloAcao(a: AcaoPermissao): string {
  return { READ: 'consulta', CREATE: 'inclusão', UPDATE: 'alteração', DELETE: 'exclusão', APPROVE: 'transmissão' }[a];
}
