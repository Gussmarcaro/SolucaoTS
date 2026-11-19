/**
 * Confere os Órgãos Concessores já cadastrados contra a tabela oficial do
 * Audesp, e **sugere a correção** de cada divergência.
 *
 *   npm run conferir:orgaos
 *
 * ## Por que ele existe
 *
 * O par (código do município, código da entidade) vai no descritor de todo
 * documento transmitido. Um par errado não quebra tela nenhuma: o cadastro
 * salva, a prestação monta, e a recusa só aparece no envio ao TCESP, meses
 * depois, como "ajuste não encontrado". O formulário passou a conferir o par na
 * digitação — mas **só a partir de agora**, e só quando alguém abre a tela.
 * Este script olha o que já estava gravado.
 *
 * Encontrou isso no primeiro uso, num cadastro real: código de entidade
 * `65391`, que é o código do município (`6539`) com um dígito colado. O certo
 * era `1`. Transmitiria errado sem nenhum aviso pelo caminho.
 *
 * ## Somente leitura, de propósito
 *
 * Ele não corrige nada. Dois motivos: a correção é de uma linha na tela, que
 * agora tem a busca; e "não está na tabela" **não** é sinônimo de errado — a
 * tabela é uma edição datada, e entidade criada depois dela ainda não aparece.
 * Quem decide é quem conhece o órgão.
 *
 * `PrismaClient` puro, sem as extensions: o recorte por órgão vem do contexto
 * da requisição, e um script roda fora de qualquer requisição — precisa
 * enxergar todos os clientes.
 */
import { PrismaClient } from '@prisma/client';
import type { Periodicidade, TipoOrgao } from '@prisma/client';

const prisma = new PrismaClient();

const TIPO_LABEL: Record<TipoOrgao, string> = {
  PREFEITURA_MUNICIPAL: 'Prefeitura Municipal',
  CAMARA: 'Câmara Municipal',
  AUTARQUIA_MUNICIPAL: 'Autarquia Municipal',
  CONSORCIO_MUNICIPAL: 'Consórcio Municipal',
  FUNDACAO_MUNICIPAL: 'Fundação Municipal',
  FUNDO_PREVIDENCIA_MUNICIPAL: 'Fundo de Previdência Municipal',
  EMPRESA_PUBLICA: 'Empresa Pública',
  UNIDADE_SECRETARIA: 'Unidade/Secretaria',
};

const PERIODICIDADE_LABEL: Record<Periodicidade, string> = {
  ANUAL: 'Anual',
  QUADRIMESTRAL: 'Quadrimestral',
};

/** Sem acento, sem caixa e sem separador — a mesma do gerador da tabela. */
const chave = (t: string) =>
  t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');

interface Aviso {
  orgao: string;
  par: string;
  problema: string;
  sugestao?: string;
  comoCorrigir?: string;
}

async function main(): Promise<void> {
  const [clientes, oficiais] = await Promise.all([
    prisma.cliente.findMany({
      select: {
        nome: true,
        codigoMunicipio: true,
        codigoEntidade: true,
        tipoOrgao: true,
        periodicidade: true,
        ativo: true,
      },
      orderBy: [{ ativo: 'desc' }, { nome: 'asc' }],
    }),
    prisma.entidadeAudesp.findMany({
      select: {
        codigoMunicipio: true,
        codigoEntidade: true,
        nomeMunicipio: true,
        nomeEntidade: true,
        tipoOrgao: true,
        periodicidade: true,
      },
    }),
  ]);

  if (oficiais.length === 0) {
    console.error(
      '\nA tabela de entidades do Audesp está vazia. Rode `npm run dominios:seed` antes.\n',
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `\nConferência dos Órgãos Concessores — ${clientes.length} cadastrado(s) contra ${oficiais.length} entidade(s) oficiais\n`,
  );

  const porPar = new Map(oficiais.map((e) => [`${e.codigoMunicipio}-${e.codigoEntidade}`, e]));
  const porMunicipio = new Map<number, typeof oficiais>();
  for (const e of oficiais) {
    const lista = porMunicipio.get(e.codigoMunicipio) ?? [];
    lista.push(e);
    porMunicipio.set(e.codigoMunicipio, lista);
  }

  /*
   * Municípios pelo nome, do mais longo para o mais curto. A ordem importa:
   * "São José do Rio Preto" contém "São José", e o município certo é o nome
   * mais específico que couber dentro do nome do órgão.
   */
  const municipios = [...new Map(oficiais.map((e) => [e.codigoMunicipio, e.nomeMunicipio])).entries()]
    .map(([codigo, nome]) => ({ codigo, nome, chave: chave(nome) }))
    .sort((a, b) => b.chave.length - a.chave.length);

  /** Acha o município cujo nome aparece no nome do órgão ("MUNICÍPIO DE ITAJOBI"). */
  function municipioPeloNome(nomeOrgao: string) {
    const k = chave(nomeOrgao);
    return municipios.find((m) => m.chave.length >= 4 && k.includes(m.chave));
  }

  const avisos: Aviso[] = [];
  let conferem = 0;

  for (const c of clientes) {
    const par = `${c.codigoMunicipio}/${c.codigoEntidade}`;
    const rotulo = `${c.nome}${c.ativo ? '' : '  (inativo)'}`;
    const oficial = porPar.get(`${c.codigoMunicipio}-${c.codigoEntidade}`);

    if (oficial) {
      // O par existe. Resta conferir o que a tabela também sabe dizer.
      const divergencias: string[] = [];
      if (oficial.tipoOrgao && oficial.tipoOrgao !== c.tipoOrgao) {
        divergencias.push(
          `tipo de órgão: cadastrado como ${TIPO_LABEL[c.tipoOrgao]}, a tabela diz ${TIPO_LABEL[oficial.tipoOrgao]}`,
        );
      }
      if (oficial.periodicidade && oficial.periodicidade !== c.periodicidade) {
        divergencias.push(
          `periodicidade: cadastrada como ${PERIODICIDADE_LABEL[c.periodicidade]}, a tabela diz ${PERIODICIDADE_LABEL[oficial.periodicidade]} — isso é prazo de entrega da Declaração Negativa`,
        );
      }

      if (divergencias.length === 0) {
        conferem++;
        console.log(`  ok   ${rotulo}  ·  ${par}  ·  ${oficial.nomeEntidade}`);
      } else {
        console.log(`  !    ${rotulo}  ·  ${par}`);
        for (const d of divergencias) console.log(`         ${d}`);
        avisos.push({ orgao: rotulo, par, problema: divergencias.join(' | ') });
      }
      continue;
    }

    // O par não existe na tabela. Vale mais do que apontar: vale sugerir.
    console.log(`  !    ${rotulo}  ·  ${par}`);
    console.log('         esse par não existe na tabela oficial do Audesp');

    const doMunicipio = porMunicipio.get(c.codigoMunicipio);
    const porNome = doMunicipio ? undefined : municipioPeloNome(c.nome);
    const candidatos = doMunicipio ?? (porNome ? porMunicipio.get(porNome.codigo) : undefined);

    let sugestao: string | undefined;
    if (!candidatos) {
      console.log(
        `         o código de município ${c.codigoMunicipio} também não existe — confira os dois pela busca da tela`,
      );
    } else {
      // Entre as entidades do município, a do mesmo tipo é a candidata natural.
      const mesmoTipo = candidatos.filter((e) => e.tipoOrgao === c.tipoOrgao);
      const escolha = mesmoTipo.length === 1 ? mesmoTipo[0] : undefined;

      if (escolha) {
        sugestao = `${escolha.codigoMunicipio} / ${escolha.codigoEntidade} — ${escolha.nomeEntidade} (${escolha.nomeMunicipio})`;
        console.log(`         provável correção: ${sugestao}`);
      } else {
        console.log(
          `         entidades de ${candidatos[0].nomeMunicipio} na tabela oficial:`,
        );
        for (const e of candidatos.slice(0, 8)) {
          console.log(
            `            ${e.codigoMunicipio} / ${e.codigoEntidade}  ${e.nomeEntidade}${e.tipoOrgao ? ` — ${TIPO_LABEL[e.tipoOrgao]}` : ''}`,
          );
        }
      }
    }

    const busca = candidatos?.[0]?.nomeMunicipio ?? c.nome;
    const comoCorrigir = `Cadastros → Órgãos Concessores → editar "${c.nome}" → campo "Localizar na tabela oficial do Audesp" → digitar "${busca}"`;
    console.log(`         ${comoCorrigir}`);
    avisos.push({ orgao: rotulo, par, problema: 'par inexistente na tabela oficial', sugestao, comoCorrigir });
  }

  console.log(
    `\n${conferem} órgão(s) conferem. ${avisos.length} com divergência.\n`,
  );

  if (avisos.length > 0) {
    console.log('Resumo do que precisa de decisão:\n');
    for (const a of avisos) {
      console.log(`  · ${a.orgao} (${a.par}): ${a.problema}`);
      if (a.sugestao) console.log(`      corrigir para ${a.sugestao}`);
    }
    console.log(
      '\nNenhuma alteração foi feita — a correção é na tela, que agora confere o par na digitação.',
    );
    console.log(
      'Par ausente da tabela nem sempre é erro: entidade criada depois da edição carregada ainda não aparece nela.\n',
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
