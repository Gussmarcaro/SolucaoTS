/**
 * O molde dos documentos oficiais que o sistema **gera** para assinatura.
 *
 * ## Por que existe um molde, e não uma tela por documento
 *
 * Os anexos do TCESP (PC-01 a PC-04, RP-01 a RP-14) têm todos a mesma
 * anatomia: título, um cabeçalho de "campo: valor", um corpo de cláusulas em
 * grupos, blocos de assinatura com nome/cargo/CPF e notas de rodapé. O que
 * varia entre eles é o conteúdo, não a forma.
 *
 * Com o molde, o texto oficial fica num só lugar — aqui no `core`, puro e
 * conferível por script — e a tela é **uma** para todos. Um anexo novo custa
 * uma função que devolve uma `Folha`, e não uma página inteira de React.
 *
 * ## `faltando` é o ponto do desenho
 *
 * Um modelo em branco todo mundo já tem: está no site do Tribunal, em .docx.
 * O que o sistema acrescenta é preencher o que já está cadastrado — e, no que
 * não está, **dizer exatamente qual campo falta e onde se preenche**. Sem isso
 * a geração devolveria o mesmo formulário vazio, com o agravante de parecer
 * pronto.
 *
 * Por isso nenhuma folha se recusa a sair por falta de dado: ela sai com a
 * linha em branco, como o modelo oficial, e a tela mostra ao lado o que
 * completar. Documento é o fim do caminho — travá-lo obrigaria a voltar ao
 * cadastro sem nem saber o que estava faltando.
 */

/** Uma linha do cabeçalho. `valor` nulo imprime a linha pontilhada do modelo. */
export interface CampoFolha {
  rotulo: string;
  valor: string | null;
  /** Marca da nota de rodapé, como "(1)" nos anexos RP. */
  nota?: string;
}

/** Um grupo de cláusulas. `titulo` nulo é texto corrido sem cabeçalho. */
export interface SecaoFolha {
  titulo: string | null;
  itens: string[];
  /** Itens numerados (ou com marcador) em vez de parágrafos soltos. */
  numerada?: boolean;
}

/**
 * Uma pessoa que assina. Qualquer campo nulo vira linha para preencher à mão.
 *
 * `origem` diz de onde o nome veio ("Cadastro do Órgão", "Diretoria da
 * entidade"). **Não é enfeite**: quem assina precisa poder conferir se o
 * sistema pegou a pessoa certa, e um nome sem procedência num documento que se
 * assina é pior do que uma linha em branco.
 */
export interface PessoaFolha {
  nome: string | null;
  cargo: string | null;
  cpf: string | null;
  origem: string | null;
}

export interface GrupoAssinaturas {
  titulo: string;
  /** Segunda linha do grupo, como "PELO ÓRGÃO PÚBLICO CONVENENTE:". */
  subtitulo?: string | null;
  pessoas: PessoaFolha[];
  /**
   * Linhas vazias a acrescentar depois das pessoas conhecidas.
   *
   * O documento tem de aceitar quem o sistema não conhece: o modelo oficial
   * manda identificar "as pessoas físicas que tenham concorrido para a prática
   * do ato", e essa lista não cabe em cadastro nenhum.
   */
  linhasEmBranco: number;
  /** Campo extra antes do nome, como "Tipo de ato sob sua responsabilidade". */
  campoExtra?: string | null;
}

export interface Folha {
  /** Identificação do anexo no TCESP: "PC-02", "RP-11". */
  anexo: string;
  titulo: string;
  subtitulo: string;
  /** Linha de advertência abaixo do subtítulo, quando o modelo tem uma. */
  observacao: string | null;
  cabecalho: CampoFolha[];
  secoes: SecaoFolha[];
  /** Rótulo do espaço de local e data, sempre antes das assinaturas. */
  localEData: string;
  assinaturas: GrupoAssinaturas[];
  notas: string[];
  /**
   * O que o sistema não soube preencher, em linguagem de usuário, já dizendo
   * onde se resolve. Vazio = folha completa.
   */
  faltando: string[];
}

// --- formatação ------------------------------------------------------------
// Mora aqui, e não na tela, porque é o que entra no documento assinado: o CPF
// mascarado e o valor em reais são conteúdo, não apresentação.

/** 11 dígitos → 000.000.000-00. Devolve como veio se não forem 11. */
export function cpfFormatado(cpf: string | null | undefined): string | null {
  if (!cpf) return null;
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** 14 dígitos → 00.000.000/0000-00. */
export function cnpjFormatado(cnpj: string | null | undefined): string | null {
  if (!cnpj) return null;
  const d = cnpj.replace(/\D/g, '');
  if (d.length !== 14) return cnpj;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function reais(valor: number | null | undefined): string | null {
  if (valor === null || valor === undefined) return null;
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** 'YYYY-MM-DD' → 'DD/MM/YYYY'. Sem `Date`, para não andar fuso. */
export function dataBr(iso: string | null | undefined): string | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
  return iso.slice(0, 10).split('-').reverse().join('/');
}

/**
 * Uma pessoa está completa para assinar?
 *
 * Os três campos juntos, porque é o que o modelo pede em toda linha de
 * assinatura: nome, cargo e CPF. Nome sem CPF não identifica ninguém para o
 * Tribunal — é pelo CPF que o CadTCESP liga a pessoa ao processo.
 */
export function pessoaCompleta(p: PessoaFolha): boolean {
  return Boolean(p.nome && p.cargo && p.cpf);
}
