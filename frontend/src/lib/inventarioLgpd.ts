/**
 * Inventário das operações de tratamento de dados pessoais (LGPD, art. 37).
 *
 * Levantado a partir do próprio modelo de dados (`schema.prisma`), não de
 * memória: cada linha corresponde a campos que existem hoje no banco. Ao
 * acrescentar campo pessoal em qualquer cadastro, acrescente aqui também —
 * inventário desatualizado é pior que inventário nenhum, porque dá a impressão
 * de que o mapeamento foi feito.
 *
 * **A base legal e o prazo de guarda são propostas de trabalho.** Quem decide é
 * o encarregado com o jurídico do órgão; aqui ficam registrados para revisão, e
 * a tela diz isso a quem lê.
 */

export interface OperacaoTratamento {
  /** De quem são os dados. */
  titular: string;
  /** Onde ficam, na linguagem do sistema. */
  onde: string;
  dados: string[];
  /** Por que o sistema trata. */
  finalidade: string;
  baseLegal: string;
  /** `true` quando há dado sensível (art. 5º, II) na linha. */
  sensivel?: boolean;
  /** Sai do sistema para onde. */
  compartilhamento: string;
}

export const OPERACOES: OperacaoTratamento[] = [
  {
    titular: 'Usuários do sistema',
    onde: 'Configurações › Usuários',
    dados: ['Nome', 'CPF', 'Endereço', 'E-mail', 'Celular', 'Senha (hash)'],
    finalidade: 'Autenticar o acesso, controlar permissões e identificar autoria na trilha de auditoria.',
    baseLegal: 'Execução de contrato (art. 7º, V) — uso do próprio sistema.',
    compartilhamento: 'Não sai do sistema.',
  },
  {
    titular: 'Dirigentes e conselheiros da OSC',
    onde: 'Entidades › Diretoria e Conselhos',
    dados: ['Nome', 'CPF', 'Data de nascimento', 'Endereço', 'E-mail', 'Telefone', 'Cargo', 'Atas em PDF'],
    finalidade: 'Compor o cadastro da entidade beneficiária e comprovar a representação legal perante o Tribunal.',
    baseLegal: 'Cumprimento de obrigação legal e regulatória (art. 7º, II) — Audesp Fase V.',
    compartilhamento: 'TCESP, no cadastro do Ajuste e nos blocos declaratórios.',
  },
  {
    titular: 'Responsável pelo ajuste',
    onde: 'Ajustes Celebrados',
    dados: ['Nome', 'CPF', 'Data de nascimento', 'Endereço', 'E-mail', 'Telefone', 'Função', 'Vigência'],
    finalidade: 'Identificar quem responde pelo ajuste durante a vigência.',
    baseLegal: 'Cumprimento de obrigação legal e regulatória (art. 7º, II).',
    compartilhamento: 'Uso interno; o Termo de Ciência e Notificação vai ao Tribunal.',
  },
  {
    titular: 'Empregados da entidade',
    onde: 'Prestação de Contas › Relação de Empregados',
    dados: ['CPF', 'CBO', 'CNS', 'Salário contratual', 'Admissão e demissão', 'Carga horária e remuneração por mês'],
    finalidade: 'Demonstrar a aplicação dos recursos em pessoal, exigência do manual da Fase V.',
    baseLegal:
      'Obrigação legal (art. 7º, II) e, para o CNS, tratamento necessário ao cumprimento de obrigação legal pelo controlador (art. 11, II, "a").',
    sensivel: true,
    compartilhamento: 'TCESP, no documento JSON da prestação de contas.',
  },
  {
    titular: 'Servidores públicos cedidos',
    onde: 'Cadastro e Prestação de Contas › Servidores Cedidos',
    dados: ['Nome', 'CPF', 'Cargo público', 'Função na entidade', 'Remuneração bruta', 'Período de cessão'],
    finalidade: 'Registrar a cessão de pessoal do órgão concessor à entidade.',
    baseLegal: 'Cumprimento de obrigação legal e regulatória (art. 7º, II).',
    compartilhamento: 'TCESP, no bloco de servidores cedidos.',
  },
  {
    titular: 'Colaboradores',
    onde: 'Cadastro › Colaboradores',
    dados: ['Nome', 'CPF', 'Cargo', 'CBO', 'CNS', 'Salário', 'Admissão e demissão'],
    finalidade: 'Manter o quadro de pessoal que alimenta os blocos da prestação.',
    baseLegal: 'Obrigação legal (art. 7º, II); CNS pelo art. 11, II, "a".',
    sensivel: true,
    compartilhamento: 'Alimenta a Relação de Empregados enviada ao TCESP.',
  },
  {
    titular: 'Fornecedores pessoa física',
    onde: 'Cadastro › Fornecedores / Prestadores',
    dados: ['Nome', 'CPF', 'Endereço', 'E-mail', 'Telefones'],
    finalidade: 'Identificar o credor de documentos fiscais e contratos pagos com recursos do repasse.',
    baseLegal: 'Cumprimento de obrigação legal e regulatória (art. 7º, II).',
    compartilhamento: 'TCESP, nos blocos de documentos fiscais e contratos.',
  },
  {
    titular: 'Ordenador de despesa e dirigentes declarados',
    onde: 'Prestação de Contas › Empenhos e Declarações',
    dados: ['CPF do ordenador', 'CPF de dirigentes', 'CPF de contratados por dirigentes'],
    finalidade: 'Atender às declarações exigidas no manual (vínculos entre dirigentes e contratados).',
    baseLegal: 'Cumprimento de obrigação legal e regulatória (art. 7º, II).',
    compartilhamento: 'TCESP, no documento JSON.',
  },
  {
    titular: 'Diversos (conteúdo de anexos)',
    onde: 'Estatuto, atas, certidões e Termo de Ciência',
    dados: ['PDFs que podem conter nome, CPF, assinatura e endereço de terceiros'],
    finalidade: 'Comprovar regularidade e representação da entidade.',
    baseLegal: 'Cumprimento de obrigação legal e regulatória (art. 7º, II).',
    compartilhamento: 'Guardados no banco; enviados ao Tribunal quando o bloco exigir.',
  },
];

/** Medidas técnicas já implementadas — o que a tela pode afirmar sem inventar. */
export const MEDIDAS: { titulo: string; descricao: string }[] = [
  {
    titulo: 'Acesso autenticado e por grupo',
    descricao:
      'Toda rota exige autenticação; a trilha de auditoria é restrita aos grupos Administrador e Suporte, tanto no menu quanto no servidor.',
  },
  {
    titulo: 'Minimização na exibição',
    descricao:
      'CPF aparece parcialmente oculto nas listagens. Exibir o dado completo é uma ação explícita, e o CBO deixou de sinalizar profissão de saúde nas grades.',
  },
  {
    titulo: 'Registro das operações de tratamento',
    descricao:
      'Alterações, exclusões e consultas a dados pessoais ficam registradas com autor, data e rota — consultáveis em Configurações › Auditoria.',
  },
  {
    titulo: 'Segredos fora da trilha',
    descricao:
      'Senha, token de recuperação e o conteúdo dos PDFs nunca entram no log de auditoria, mesmo quando o registro inteiro é gravado numa exclusão.',
  },
  {
    titulo: 'Senha protegida',
    descricao: 'Guardada apenas como hash bcrypt; a recuperação usa token de uso único com validade.',
  },
];

/** Pontos que ainda dependem de decisão do órgão — a tela mostra como pendência. */
export const PENDENCIAS: string[] = [
  'Definir o prazo de guarda de cada categoria e o descarte ao fim dele (art. 16).',
  'Nomear o encarregado (DPO) e publicar o canal de contato do titular (art. 41).',
  'Confirmar com o jurídico as bases legais propostas neste inventário.',
  'Registrar o TCESP como destinatário nos avisos de privacidade da entidade.',
];
