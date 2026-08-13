import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = join(dirname(fileURLToPath(import.meta.url)), 'base');

/** Um documento da base, com o nome que o assistente deve citar. */
interface Documento {
  arquivo: string;
  /** Como o assistente se refere a ele na resposta. */
  titulo: string;
}

/**
 * A ordem importa: o modelo lê de cima para baixo, e o mapa de navegação vem
 * primeiro porque é o que responde "onde fica isso no sistema" — a pergunta
 * mais frequente e a mais fácil de responder errado.
 */
const DOCUMENTOS: Documento[] = [
  { arquivo: 'sistema-navegacao.md', titulo: 'Mapa de navegação do sistema Solução TS' },
  { arquivo: 'regras-negocio-fase-v.md', titulo: 'Síntese das regras de negócio da Fase V' },
  { arquivo: 'manual-prestacao-v1.19.txt', titulo: 'Manual da Prestação de Contas dos Repasses ao Terceiro Setor — v1.19 (TCESP)' },
  { arquivo: 'manual-cadastro-ajustes.txt', titulo: 'Manual do Sistema Audesp — Cadastro de Ajustes, Fase V (TCESP)' },
  { arquivo: 'manual-declaracao-negativa.txt', titulo: 'Manual da Declaração Negativa — Fase V (TCESP)' },
  { arquivo: 'manual-alteracao-exclusao.txt', titulo: 'Manual de Alteração e Exclusão — Repasses ao Terceiro Setor (TCESP)' },
  { arquivo: 'manual-converter-excel-csv.txt', titulo: 'Manual de conversão de Excel para CSV (TCESP)' },
];

let corpusEmMemoria: string | null = null;

/**
 * Monta o corpus que vai no prompt, uma vez por processo.
 *
 * São ~250 KB de texto. Carregar a cada pergunta seria desperdício de I/O, e o
 * conteúdo só muda quando alguém roda `npm run assistente:base` e reinicia o
 * servidor — não há o que invalidar em tempo de execução.
 *
 * Cada documento entra delimitado e **nomeado**: é assim que o assistente
 * consegue dizer de onde tirou a resposta, que é metade do valor dele.
 */
export function corpus(): string {
  if (corpusEmMemoria) return corpusEmMemoria;

  const partes = DOCUMENTOS.map(({ arquivo, titulo }) => {
    const texto = readFileSync(join(BASE, arquivo), 'utf8');
    return `<documento titulo="${titulo}" arquivo="${arquivo}">\n${texto}\n</documento>`;
  });

  corpusEmMemoria = partes.join('\n\n');
  return corpusEmMemoria;
}

/** Títulos disponíveis — usado no aviso de inicialização e em diagnóstico. */
export const TITULOS = DOCUMENTOS.map((d) => d.titulo);
