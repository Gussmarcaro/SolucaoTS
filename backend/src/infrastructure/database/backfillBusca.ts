import { prisma } from './prisma';
import {
  buscaBemCedido,
  buscaColaborador,
  buscaContrato,
  buscaEmpresa,
  buscaEntidade,
  buscaFornecedor,
  buscaServidorCedido,
  buscaUsuario,
} from './buscaTexto';

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

    const fornecedores = await prisma.fornecedor.findMany({
      where: { buscaTexto: '' },
      select: {
        id: true, nome: true, documento: true, cep: true, logradouro: true,
        numero: true, complemento: true, bairro: true, cidade: true, uf: true,
        email: true, telefoneFixo: true, whatsapp: true,
      },
    });
    for (const f of fornecedores) {
      await prisma.fornecedor.update({ where: { id: f.id }, data: { buscaTexto: buscaFornecedor(f) } });
    }

    const colaboradores = await prisma.colaborador.findMany({
      where: { buscaTexto: '' },
      select: { id: true, nome: true, cpf: true, cargo: true, cbo: true, cns: true },
    });
    for (const c of colaboradores) {
      await prisma.colaborador.update({
        where: { id: c.id },
        data: { buscaTexto: buscaColaborador(c) },
      });
    }

    const contratos = await prisma.contratoFirmado.findMany({
      where: { buscaTexto: '' },
      select: {
        id: true,
        numero: true,
        credorNome: true,
        credorDocumento: true,
        naturezaContratacao: true,
        objeto: true,
      },
    });
    for (const c of contratos) {
      await prisma.contratoFirmado.update({
        where: { id: c.id },
        data: { buscaTexto: buscaContrato(c) },
      });
    }

    const bens = await prisma.bemCedido.findMany({
      where: { buscaTexto: '' },
      select: { id: true, descricao: true, tipo: true, identificador: true, observacao: true },
    });
    for (const b of bens) {
      await prisma.bemCedido.update({ where: { id: b.id }, data: { buscaTexto: buscaBemCedido(b) } });
    }

    const servidores = await prisma.servidorCedidoCadastro.findMany({
      where: { buscaTexto: '' },
      select: {
        id: true,
        nome: true,
        cpf: true,
        cargoPublico: true,
        funcaoEntidade: true,
        onusPagamento: true,
      },
    });
    for (const s of servidores) {
      await prisma.servidorCedidoCadastro.update({
        where: { id: s.id },
        data: { buscaTexto: buscaServidorCedido(s) },
      });
    }

    if (
      usuarios.length ||
      empresas.length ||
      entidades.length ||
      fornecedores.length ||
      colaboradores.length ||
      contratos.length ||
      bens.length ||
      servidores.length
    ) {
      console.log(
        `[backfill] buscaTexto preenchido: ${usuarios.length} usuário(s), ${empresas.length} empresa(s), ${entidades.length} entidade(s), ${fornecedores.length} fornecedor(es), ${colaboradores.length} colaborador(es), ${contratos.length} contrato(s), ${bens.length} bem(ns), ${servidores.length} servidor(es).`,
      );
    }
  } catch (err) {
    console.error('[backfill] falha (não crítico):', err);
  }
}
