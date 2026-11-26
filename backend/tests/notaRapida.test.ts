import { describe, expect, it } from 'vitest';
import {
  LIMITE_CARACTERES,
  LIMITE_NOTAS,
  NotaRapidaUseCases,
  type INotaRapidaRepository,
  type NotaRapida,
} from '../src/application/notaRapida/NotaRapidaUseCases';

/** Repositório em memória com a mesma regra do Prisma: tudo pelo par id + dono. */
function memoria(): INotaRapidaRepository {
  const notas: (NotaRapida & { usuarioId: string })[] = [];
  let seq = 0;
  const agora = () => new Date().toISOString();
  return {
    async listar(u) {
      return notas.filter((n) => n.usuarioId === u);
    },
    async contar(u) {
      return notas.filter((n) => n.usuarioId === u).length;
    },
    async criar(u, texto) {
      const n = { id: String(++seq), usuarioId: u, texto, criadoEm: agora(), atualizadoEm: agora() };
      notas.push(n);
      return n;
    },
    async atualizar(u, id, texto) {
      const n = notas.find((x) => x.id === id && x.usuarioId === u);
      if (!n) return null;
      n.texto = texto;
      return n;
    },
    async excluir(u, id) {
      const i = notas.findIndex((x) => x.id === id && x.usuarioId === u);
      if (i < 0) return false;
      notas.splice(i, 1);
      return true;
    },
  };
}

describe('bloco de notas', () => {
  it('cada usuário só vê as próprias notas', async () => {
    const c = new NotaRapidaUseCases(memoria());
    await c.criar('ana', 'ligar para a Thays');
    await c.criar('beto', 'conferir extrato');
    expect((await c.listar('ana')).map((n) => n.texto)).toEqual(['ligar para a Thays']);
  });

  it('nota de outra pessoa não existe para quem pergunta: 404, nunca "acesso negado"', async () => {
    const c = new NotaRapidaUseCases(memoria());
    const n = await c.criar('ana', 'privado');
    await expect(c.atualizar('beto', n.id, 'invadido')).rejects.toThrow('Nota não encontrada');
    await expect(c.excluir('beto', n.id)).rejects.toThrow('Nota não encontrada');
    expect((await c.listar('ana'))[0].texto).toBe('privado');
  });

  it('recusa texto acima do limite', async () => {
    const c = new NotaRapidaUseCases(memoria());
    await expect(c.criar('ana', 'x'.repeat(LIMITE_CARACTERES + 1))).rejects.toThrow('caracteres');
  });

  it('recusa passar do número máximo de notas', async () => {
    const c = new NotaRapidaUseCases(memoria());
    for (let i = 0; i < LIMITE_NOTAS; i++) await c.criar('ana', String(i));
    await expect(c.criar('ana', 'mais uma')).rejects.toThrow(String(LIMITE_NOTAS));
    // o limite é por pessoa
    await expect(c.criar('beto', 'a primeira')).resolves.toBeTruthy();
  });

  it('nota vazia é aceita — é como nasce uma nota nova', async () => {
    const c = new NotaRapidaUseCases(memoria());
    expect((await c.criar('ana', '')).texto).toBe('');
  });
});
