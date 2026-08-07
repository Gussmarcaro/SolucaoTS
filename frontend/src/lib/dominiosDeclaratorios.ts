// Tabelas de domínio FIXAS do manual v1.19 (blocos declaratórios). Não são
// códigos inventados — constam do manual do TCESP.

// --- Parecer Conclusivo (§33) ---
export const CONCLUSAO_PARECER: Record<number, string> = {
  1: 'Favorável',
  2: 'Favorável com ressalvas',
  3: 'Desfavorável',
};

export const RESPOSTA_DECLARACAO: Record<number, string> = {
  1: 'Sim',
  2: 'Não',
  3: 'Prejudicado',
};

export interface PerguntaParecer {
  tipo: number;
  titulo: string;
  pergunta: string;
  permitePrejudicado?: boolean; // tipo 4
  justificativaSeSim?: boolean; // tipo 7
}

export const PERGUNTAS_PARECER: PerguntaParecer[] = [
  { tipo: 1, titulo: 'Cumprimento das cláusulas', pergunta: 'Houve o cumprimento das cláusulas pactuadas em conformidade com a regulamentação que rege a matéria?' },
  { tipo: 2, titulo: 'Regularidade dos gastos', pergunta: 'Houve regularidade dos gastos efetuados e sua perfeita contabilização, atestadas pelo órgão/entidade concessor?' },
  { tipo: 3, titulo: 'Identificação nos comprovantes', pergunta: 'Os originais dos comprovantes de gastos contêm a identificação da entidade beneficiária, do tipo de repasse e do número do ajuste, bem como do órgão/entidade repassador(a)?' },
  { tipo: 4, titulo: 'Recolhimentos de encargos trabalhistas', pergunta: 'Houve regularidade dos recolhimentos de encargos trabalhistas, quando a aplicação dos recursos envolver gastos com pessoal?', permitePrejudicado: true },
  { tipo: 5, titulo: 'Atendimento aos princípios', pergunta: 'Houve atendimento aos princípios da legalidade, impessoalidade, moralidade, publicidade, eficiência, motivação e interesse público?' },
  { tipo: 6, titulo: 'Realização de visita', pergunta: 'Houve realização de visita in loco pelo órgão ou entidade concessor(a)?' },
  { tipo: 7, titulo: 'Aplicação de sanções', pergunta: 'Houve aplicação de sanções por eventuais ausências de comprovação ou desvio de finalidade?', justificativaSeSim: true },
];

// --- Transparência (§34) ---
export const REQUISITOS_781: Record<number, string> = {
  1: 'Competência e Estrutura Organizacional',
  2: 'Endereço, e-mail, telefones e horários de atendimento das principais unidades',
  3: 'Registro de quaisquer repasses ou transferências de recursos financeiros',
  4: 'Registros de despesas realizadas com recursos públicos',
  5: 'Contratações de bens e serviços, incluindo editais, resultados e contratos celebrados',
  6: 'Informações para acompanhamento de programas, ações, projetos e obras, metas e indicadores',
  7: 'Respostas a perguntas mais frequentes da sociedade',
  8: 'Resultado de inspeções, auditorias e tomadas de contas dos controles interno e externo',
};

export const REQUISITOS_83: Record<number, string> = {
  1: 'Ferramenta de pesquisa de conteúdo',
  2: 'Geração de relatórios em diversos formatos eletrônicos abertos',
  3: 'Acesso automatizado por sistemas externos em formatos abertos',
  4: 'Divulga em detalhes os formatos utilizados na estruturação da informação',
  5: 'Garante autenticidade e integridade das informações divulgadas',
  6: 'Atualização periódica',
};

// --- Conclusão de relatório final (§25/26/27) ---
export const CONCLUSAO_RELATORIO: Record<number, string> = {
  1: 'Favorável sem Ressalvas',
  2: 'Favorável com Ressalvas',
  3: 'Desfavorável',
};

// --- Publicações (veículo de comunicação, §22/28/29/30) ---
export const VEICULO_PUBLICACAO: Record<number, string> = {
  1: 'Diário Oficial do Município',
  2: 'Diário Oficial do Estado',
  3: 'Diário Oficial da União',
  4: 'Diário da Justiça Eletrônico',
  5: 'Portal Nacional de Compras Públicas',
  6: 'Jornal de grande circulação nacional',
  7: 'Jornal de grande circulação regional/municipal',
  8: 'Quadro ou mural de acesso público',
  9: 'Site da administração direta na Internet',
  10: 'Outros',
};

// --- Publicações de Parecer ou Ata (§29) ---
export const TIPO_PARECER_ATA: Record<number, string> = {
  1: 'Parecer ou Ata do Conselho Fiscal',
  2: 'Parecer ou Ata do Conselho de Administração',
  3: 'Parecer da Auditoria Independente',
  4: 'Parecer do Conselho de Políticas Públicas',
};

export const CONCLUSAO_PARECER_ATA: Record<number, string> = {
  1: 'Favorável sem Ressalvas',
  2: 'Favorável com Ressalvas',
  3: 'Desfavorável',
  4: 'Adverso',
  5: 'Com abstenção de opinião',
};

export const REQUISITOS_DIVULGACAO: Record<number, string> = {
  1: 'Estatuto Social atualizado',
  2: 'Ajustes (Termo de Parceria, Convênio, etc.)',
  3: 'Plano de Trabalho',
  4: 'Relação Nominal dos Dirigentes',
  5: 'Lista de prestadores de serviços e valores pagos',
  6: 'Remuneração individualizada dos dirigentes e empregados (nomes e cargos)',
  7: 'Balanços e Demonstrações Contábeis',
  8: 'Regulamento de Compras',
  9: 'Regulamento de Contratação de Pessoal',
  10: 'Relatório estatístico de atendimento realizado pelo SIC',
};
