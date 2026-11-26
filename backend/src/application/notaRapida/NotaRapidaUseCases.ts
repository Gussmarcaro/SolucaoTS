import { BusinessError, NotFoundError } from '@/shared/errors';

export interface NotaRapida {
  id: string;
  texto: string;
  criadoEm: string;
  atualizadoEm: string;
}

/**
 * O bloco de notas da barra superior.
 *
 * **O dono é sempre o do token.** Toda operação recebe o `usuarioId` do
 * controller, que o tira de `req.usuario` — nunca da URL nem do corpo. Uma
 * nota de outra pessoa não "dá acesso negado": ela simplesmente não existe
 * para quem pergunta, e a resposta é 404, sem confirmar que o id existe.
 */
export interface INotaRapidaRepository {
  listar(usuarioId: string): Promise<NotaRapida[]>;
  contar(usuarioId: string): Promise<number>;
  criar(usuarioId: string, texto: string): Promise<NotaRapida>;
  /** Null quando a nota não é do usuário (ou não existe). */
  atualizar(usuarioId: string, id: string, texto: string): Promise<NotaRapida | null>;
  excluir(usuarioId: string, id: string): Promise<boolean>;
}

/**
 * Limites de um **bloco de rascunho**, não de um editor de documentos. Sem
 * eles, o salvar automático a cada pausa poderia encher o banco com um texto
 * colado sem querer, e a lista viraria um arquivo morto.
 */
export const LIMITE_CARACTERES = 10_000;
export const LIMITE_NOTAS = 200;

export class NotaRapidaUseCases {
  constructor(private readonly repo: INotaRapidaRepository) {}

  listar(usuarioId: string) {
    return this.repo.listar(usuarioId);
  }

  /** Só o número — é o que o contador do botão precisa, sem trazer texto nenhum. */
  contar(usuarioId: string) {
    return this.repo.contar(usuarioId);
  }

  async criar(usuarioId: string, texto: unknown) {
    if ((await this.repo.contar(usuarioId)) >= LIMITE_NOTAS)
      throw new BusinessError(`O bloco já tem ${LIMITE_NOTAS} notas. Apague as que não servem mais.`);
    return this.repo.criar(usuarioId, validar(texto));
  }

  async atualizar(usuarioId: string, id: string, texto: unknown) {
    const nota = await this.repo.atualizar(usuarioId, id, validar(texto));
    if (!nota) throw new NotFoundError('Nota não encontrada.');
    return nota;
  }

  async excluir(usuarioId: string, id: string) {
    if (!(await this.repo.excluir(usuarioId, id))) throw new NotFoundError('Nota não encontrada.');
  }
}

function validar(texto: unknown): string {
  const t = typeof texto === 'string' ? texto : '';
  if (t.length > LIMITE_CARACTERES)
    throw new BusinessError(`A nota passou de ${LIMITE_CARACTERES.toLocaleString('pt-BR')} caracteres.`);
  return t;
}
