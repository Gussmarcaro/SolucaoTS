/**
 * ANEXO PC-02 — Termo de Consentimento (contas bancárias).
 *
 * ## O que é
 *
 * A autorização pela qual o órgão permite ao TCESP consultar, direto nas
 * instituições financeiras, a movimentação e o saldo das contas de recursos
 * públicos de **todos os CNPJs vinculados ao órgão**. Não é por ajuste nem por
 * exercício: é um termo do órgão, assinado uma vez pela autoridade responsável.
 *
 * ## Por que o sistema o gera
 *
 * Porque é o anexo mais curto e o que mais vezes volta para refazer. O texto é
 * fixo — palavra por palavra a do modelo oficial —, e o que se preenche são
 * três campos que o cadastro do órgão já tem: nome do órgão, responsável e CPF.
 * Digitá-los à mão num .docx é onde nascem os erros que fazem o termo ser
 * rejeitado: CPF de outra pessoa, nome do órgão abreviado, cargo em branco.
 *
 * O texto está transcrito do modelo do TCESP sem uma vírgula de diferença, e é
 * `verificar:documentos` que mantém essa afirmação verdadeira — qualquer
 * reescrita "para melhorar" quebra o script.
 *
 * Função pura: recebe os dados do órgão, devolve a folha.
 */
import { cnpjFormatado, cpfFormatado, type Folha } from './folha';

export interface DadosTermoConsentimento {
  /** Nome do órgão, como está no cadastro ("PREFEITURA MUNICIPAL DE ITAJOBI"). */
  orgaoNome: string;
  orgaoCnpj: string | null;
  /**
   * Município do órgão — vira o "LOCAL" da assinatura.
   *
   * Vem da tabela oficial do Audesp pelo código do município, e não de um
   * campo digitado: o órgão já declara esse código, e derivar evita um cadastro
   * a mais que diria a mesma coisa de forma possivelmente divergente.
   */
  municipio: string | null;
  /** Quem assina: a autoridade máxima do órgão. */
  responsavelNome: string | null;
  responsavelCargo: string | null;
  responsavelCpf: string | null;
}

export function montarTermoConsentimento(d: DadosTermoConsentimento): Folha {
  const faltando: string[] = [];
  if (!d.responsavelNome || !d.responsavelCpf)
    faltando.push(
      'Autoridade máxima do órgão (nome, cargo e CPF) — Configurações → Órgãos Concessores.',
    );
  else if (!d.responsavelCargo)
    faltando.push('Cargo da autoridade máxima do órgão — Configurações → Órgãos Concessores.');

  return {
    anexo: 'PC-02',
    titulo: 'ANEXO PC-02 - TERMO DE CONSENTIMENTO',
    subtitulo: '(CONTAS BANCÁRIAS)',
    observacao: null,
    cabecalho: [
      {
        rotulo: 'ÓRGÃO OU ENTIDADE',
        valor: d.orgaoCnpj
          ? `${d.orgaoNome} — CNPJ ${cnpjFormatado(d.orgaoCnpj)}`
          : d.orgaoNome,
      },
      { rotulo: 'RESPONSÁVEL', valor: d.responsavelNome },
      { rotulo: 'CPF', valor: cpfFormatado(d.responsavelCpf) },
    ],
    secoes: [
      {
        titulo: null,
        itens: ['Pelo presente TERMO, nós, abaixo identificados'],
      },
      {
        titulo: 'AUTORIZAMOS de forma expressa:',
        itens: [
          'Que o Tribunal de Contas do Estado de São Paulo acesse, de forma direta junto às instituições financeiras de qualquer espécie, os dados de movimentação e saldo das contas bancárias, atreladas ao contrato de prestação de serviços bancários, de todos os CNPJs vinculados a este órgão, com as seguintes identificações: “Código da Agência Mantenedora da Conta”; “Dígito Verificador da Agência”; “Número da Conta Corrente”; e “Dígito Verificador da Conta”.',
        ],
      },
      {
        titulo: 'ESTAMOS CIENTES:',
        numerada: true,
        itens: [
          'Que o TCESP terá acesso somente aos dados das contas de recursos públicos, privando-se a utilização dessas informações para os fins da atividade constitucional de controle externo;',
          'Que o TCESP utilizará os dados dispostos neste instrumento nos termos de seus normativos internos que regulam o uso deste tipo de informação e dentro dos seus objetivos instituicionais previstos em lei; e,',
          'Que em razão da natureza dos dados, as Partes se obrigam a manter sigilo sobre as respectivas informações, bem como as demais ações realizadas em sua execução, a contar da data de assinatura do presente instrumento, perdurando por prazo indeterminado.',
        ],
      },
    ],
    localEData: d.municipio ? `${d.municipio}, ______ de __________________ de ______.` : 'LOCAL e DATA:',
    assinaturas: [
      {
        titulo: 'RESPONSÁVEL',
        subtitulo: '(nome, cargo e assinatura)',
        pessoas: [
          {
            nome: d.responsavelNome,
            cargo: d.responsavelCargo,
            cpf: cpfFormatado(d.responsavelCpf),
            origem: d.responsavelNome ? 'Cadastro do Órgão Concessor' : null,
          },
        ],
        linhasEmBranco: 0,
      },
    ],
    notas: [],
    faltando,
  };
}
