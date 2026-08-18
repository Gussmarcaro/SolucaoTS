import type { Prisma } from '@prisma/client';
import { prismaGlobal } from './prisma';
import type {
  ISuporteRepository,
  OrgaoResumo,
  ProvisionarResultado,
} from '@/application/suporte/SuporteUseCases';
import { GRUPO_INICIAL } from '@/application/suporte/SuporteUseCases';
import { buscaUsuario, buscaGrupo, buscaCliente } from './buscaTexto';

/**
 * O único lugar que fala com o banco sem o recorte por órgão.
 *
 * É legítimo aqui e em nenhum outro lugar: criar um órgão de dentro de outro
 * órgão é uma contradição, e as conferências de duplicidade (CNPJ, e-mail, CPF)
 * precisam enxergar o sistema todo — senão o provisionamento passa e a
 * gravação estoura na chave única, sem mensagem que ajude.
 *
 * Quem autoriza a chegada até aqui é `SuporteUseCases`, pela marca
 * `Usuario.suporte`.
 */
export class PrismaSuporteRepository implements ISuporteRepository {
  async listarOrgaos(): Promise<OrgaoResumo[]> {
    const rows = await prismaGlobal.cliente.findMany({
      select: {
        id: true,
        nome: true,
        cnpj: true,
        ativo: true,
        _count: { select: { usuarios: true } },
      },
      orderBy: { nome: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      nome: r.nome,
      cnpj: r.cnpj,
      ativo: r.ativo,
      usuarios: r._count.usuarios,
    }));
  }

  async orgaoExiste(id: string): Promise<{ id: string; nome: string } | null> {
    return prismaGlobal.cliente.findUnique({ where: { id }, select: { id: true, nome: true } });
  }

  async cnpjEmUso(cnpj: string): Promise<boolean> {
    return (await prismaGlobal.cliente.count({ where: { cnpj } })) > 0;
  }

  async emailEmUso(email: string): Promise<boolean> {
    return (await prismaGlobal.usuario.count({ where: { email } })) > 0;
  }

  async documentoEmUso(documento: string): Promise<boolean> {
    return (await prismaGlobal.usuario.count({ where: { documento } })) > 0;
  }

  /**
   * Órgão + grupo Administrador + primeiro usuário, numa transação.
   *
   * Ou vai tudo, ou não vai nada: um órgão sem administrador não tem como ser
   * acessado, e um usuário sem grupo cai na regra de "grupo nunca configurado",
   * que libera tudo. Meio provisionamento é pior que nenhum.
   */
  async provisionar(dados: {
    orgao: {
      nome: string;
      cnpj: string;
      codigoMunicipio: number;
      codigoEntidade: number;
      tipoOrgao: string;
      periodicidade: string;
    };
    admin: {
      nome: string;
      email: string;
      documento: string;
      senhaHash: string;
      suporte?: boolean;
    };
  }): Promise<ProvisionarResultado> {
    return prismaGlobal.$transaction(async (tx) => {
      const cliente = await tx.cliente.create({
        data: {
          nome: dados.orgao.nome,
          cnpj: dados.orgao.cnpj,
          codigoMunicipio: dados.orgao.codigoMunicipio,
          codigoEntidade: dados.orgao.codigoEntidade,
          tipoOrgao: dados.orgao.tipoOrgao as Prisma.ClienteCreateInput['tipoOrgao'],
          periodicidade: dados.orgao.periodicidade as Prisma.ClienteCreateInput['periodicidade'],
          buscaTexto: buscaCliente(dados.orgao),
        },
        select: { id: true, nome: true },
      });

      // `clienteId` explícito em toda criação daqui: o carimbo automático usaria
      // o órgão de quem está provisionando, que é justamente o errado.
      const grupo = await tx.grupoUsuario.create({
        data: {
          nome: GRUPO_INICIAL,
          descricao: 'Acesso total ao órgão',
          clienteId: cliente.id,
          buscaTexto: buscaGrupo({ nome: GRUPO_INICIAL, descricao: 'Acesso total ao órgão' }),
        },
        select: { id: true },
      });

      const admin = { ...dados.admin, numero: null, complemento: null };
      const usuario = await tx.usuario.create({
        data: {
          clienteId: cliente.id,
          grupoUsuarioId: grupo.id,
          nome: dados.admin.nome,
          documento: dados.admin.documento,
          email: dados.admin.email,
          senhaHash: dados.admin.senhaHash,
          suporte: dados.admin.suporte === true,
          // Endereço e celular são obrigatórios no cadastro, mas o suporte não
          // os conhece no provisionamento. Ficam em branco para o próprio
          // administrador completar no primeiro acesso.
          cep: '',
          logradouro: '',
          bairro: '',
          cidade: '',
          uf: '',
          celular: '',
          buscaTexto: buscaUsuario({ ...admin, cep: '', logradouro: '', bairro: '', cidade: '', uf: '', celular: '' }),
        },
        select: { id: true },
      });

      return {
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        usuarioId: usuario.id,
        grupoId: grupo.id,
      };
    });
  }
}
