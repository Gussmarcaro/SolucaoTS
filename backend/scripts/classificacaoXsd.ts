import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * A classificação econômica de exercícios anteriores, lida do **XSD do Audesp
 * contábil** — não de planilha.
 *
 * O TCESP não publicou o `.xlsx` de 2024 no mesmo lugar do de 2025, mas o tipo
 * `ClassificacaoDespesaExecutiva_t` do XSD das Tabelas Auxiliares é exatamente
 * a classificação daquele exercício: código de 8 dígitos e o nome da rubrica no
 * comentário ao lado.
 *
 * **Por que vale carregar.** A §17 #2 permite empenho emitido antes do período
 * na *primeira* prestação do ajuste — então a prestação de 2025 pode conter
 * empenho de 2024. Enquanto o exercício não estava carregado,
 * `codigosInexistentes` se calava sobre ele: evita bloqueio indevido, mas
 * também deixa o código errado passar até o Tribunal recusar.
 *
 * **O que esta fonte não tem**, e o que fica no lugar:
 *
 * - **Os componentes** (categoria, grupo, modalidade, elemento, subelemento)
 *   são derivados do próprio código — é assim que ele é formado, e é assim que
 *   o gerador de 2025 o monta a partir das colunas da planilha.
 * - **Escrituração** e **esferas** não existem no XSD. A primeira fica nula; as
 *   segundas ficam `EMC`, o valor permissivo. Nenhuma das duas entra na
 *   validação de existência — `codigosInexistentes` compara exercício + código
 *   —, então inventar um recorte mais estreito criaria risco de bloqueio sem
 *   ganho nenhum.
 * - **Situação** (inclusão/alteração) descreve uma edição de planilha que esta
 *   fonte não conhece; fica nula.
 */
export function lerClassificacaoDoXsd(caminhoDoXsd: string): unknown[] {
  /*
   * Latin-1, e não UTF-8.
   *
   * Lido como UTF-8, todo acento de nome de rubrica vira lixo — e o nome é o
   * que a tela mostra e o que a busca indexa. É a mesma armadilha do CSV do
   * MTE e dos CSVs de importação do plano.
   */
  const texto = readFileSync(resolve(caminhoDoXsd)).toString('latin1');

  const abre = '<xs:simpleType name="ClassificacaoDespesaExecutiva_t">';
  const inicio = texto.indexOf(abre);
  if (inicio < 0)
    throw new Error(`Tipo ClassificacaoDespesaExecutiva_t não encontrado em ${caminhoDoXsd}`);
  const fim = texto.indexOf('</xs:simpleType>', inicio);
  const trecho = texto.slice(inicio, fim);

  const registros: unknown[] = [];
  const vistos = new Set<string>();

  // <xs:enumeration value="31304100"/> <!-- CONTRIBUIÇÕES -->
  const padrao = /<xs:enumeration value="(\d{8})"\s*\/>\s*(?:<!--\s*([\s\S]*?)\s*-->)?/g;
  let m: RegExpExecArray | null;
  while ((m = padrao.exec(trecho))) {
    const codigo = m[1];
    if (vistos.has(codigo)) continue;
    vistos.add(codigo);

    const nome = (m[2] ?? '').replace(/\s+/g, ' ').trim();
    // Código sem nome não serve à tela nem à busca, e não há de onde tirá-lo.
    if (!nome) continue;

    registros.push([
      codigo,
      codigo.slice(0, 1), // categoria
      codigo.slice(1, 2), // grupo
      codigo.slice(2, 4), // modalidade
      codigo.slice(4, 6), // elemento
      codigo.slice(6, 8), // subelemento
      nome,
      null, // escrituração: o XSD não diz
      'EMC', // esferas: permissivo, e fora da validação de existência
      null, // situação: não descrita nesta fonte
    ]);
  }

  registros.sort((a, b) => (a as string[])[0].localeCompare((b as string[])[0]));
  return registros;
}
