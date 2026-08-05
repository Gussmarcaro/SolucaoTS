import { prisma } from './prisma';
import { buscaEmpresa, buscaEntidade, buscaUsuario } from './buscaTexto';

/**
 * Preenche o campo `buscaTexto` de registros que ainda não o têm (criados
 * antes desta funcionalidade). Idempotente e não-crítico — roda no startup.
 */
export async function backfillBusca(): Promise<void> {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: { buscaTexto: '' },
      select: {
        id: true, nome: true, documento: true, cep: true, logradouro: true,
        numero: true, complemento: true, bairro: true, cidade: true, uf: true,
        email: true, celular: true,
      },
    });
    for (const u of usuarios) {
      await prisma.usuario.update({ where: { id: u.id }, data: { buscaTexto: buscaUsuario(u) } });
    }

    const empresas = await prisma.empresa.findMany({
      where: { buscaTexto: '' },
      select: {
        id: true, razaoSocial: true, nomeFantasia: true, cnpj: true, cep: true,
        logradouro: true, numero: true, complemento: true, bairro: true, cidade: true,
        uf: true, email: true, telefoneFixo: true, whatsapp: true,
      },
    });
    for (const e of empresas) {
      await prisma.empresa.update({ where: { id: e.id }, data: { buscaTexto: buscaEmpresa(e) } });
    }

    const entidades = await prisma.entidadeBeneficiaria.findMany({
      where: { buscaTexto: '' },
      select: {
        id: true, razaoSocial: true, nomeFantasia: true, cnpj: true, cep: true,
        logradouro: true, numero: true, complemento: true, bairro: true, cidade: true,
        uf: true, email: true, telefoneFixo: true, whatsapp: true,
      },
    });
    for (const e of entidades) {
      await prisma.entidadeBeneficiaria.update({ where: { id: e.id }, data: { buscaTexto: buscaEntidade(e) } });
    }

    if (usuarios.length || empresas.length || entidades.length) {
      console.log(
        `[backfill] buscaTexto preenchido: ${usuarios.length} usuário(s), ${empresas.length} empresa(s), ${entidades.length} entidade(s).`,
      );
    }
  } catch (err) {
    console.error('[backfill] falha (não crítico):', err);
  }
}
