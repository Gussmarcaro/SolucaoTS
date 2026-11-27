import { describe, expect, it } from 'vitest';
import {
  VALIDADE_MS,
  VerificarSessaoUseCase,
  type EstadoUsuario,
} from '../src/application/sessao/VerificarSessaoUseCase';

function montar(inicial: EstadoUsuario | null, encerradas: string[] = []) {
  let estado = inicial;
  let t = 0;
  let consultas = 0;
  const caso = new VerificarSessaoUseCase(
    {
      async usuario() {
        consultas++;
        return estado;
      },
      async sessaoEncerrada(id) {
        return encerradas.includes(id);
      },
    },
    () => t,
  );
  return {
    caso,
    mudar: (e: EstadoUsuario | null) => (estado = e),
    encerrar: (id: string) => encerradas.push(id),
    avancar: (ms: number) => (t += ms),
    consultas: () => consultas,
  };
}

const ativo: EstadoUsuario = { ativo: true, grupoNome: 'Gestores', suporte: false };
const claims = { usuarioId: 'u1', sessaoId: 's1', grupo: 'Gestores', suporte: false };

describe('VerificarSessaoUseCase', () => {
  it('sessão em dia passa, e a resposta fica em cache', async () => {
    const m = montar(ativo);
    expect(await m.caso.verificar(claims)).toBeNull();
    await m.caso.verificar(claims);
    expect(m.consultas()).toBe(1);
  });

  it('usuário inativado cai depois do cache', async () => {
    const m = montar(ativo);
    await m.caso.verificar(claims);
    m.mudar({ ...ativo, ativo: false });
    expect(await m.caso.verificar(claims)).toBeNull();
    m.avancar(VALIDADE_MS);
    expect(await m.caso.verificar(claims)).toBe('INATIVO');
  });

  it('usuário apagado também é recusado', async () => {
    expect(await montar(null).caso.verificar(claims)).toBe('INATIVO');
  });

  it('troca de grupo e perda da marca de Suporte pedem novo login', async () => {
    expect(await montar({ ...ativo, grupoNome: 'Consulta' }).caso.verificar(claims)).toBe('PERMISSOES_MUDARAM');
    const sup = { ...claims, suporte: true };
    expect(await montar(ativo).caso.verificar(sup)).toBe('PERMISSOES_MUDARAM');
  });

  it('logout vale na hora, sem esperar o cache', async () => {
    const m = montar(ativo);
    expect(await m.caso.verificar(claims)).toBeNull();
    m.encerrar('s1');
    m.caso.esquecer('s1');
    expect(await m.caso.verificar(claims)).toBe('ENCERRADA');
  });

  it('falha do banco não derruba a sessão', async () => {
    const caso = new VerificarSessaoUseCase({
      usuario: async () => {
        throw new Error('sem banco');
      },
      sessaoEncerrada: async () => false,
    });
    expect(await caso.verificar(claims)).toBeNull();
  });
});
