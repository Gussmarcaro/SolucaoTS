/**
 * Estrutura padrão do Plano de Aplicação — o modelo mais usado nas parcerias
 * de saúde do Terceiro Setor em SP.
 *
 * Fica no **core**, e não só na tela, porque a digitação precisa validar o que
 * chega: sem isso, o servidor aceitaria qualquer par categoria/subcategoria e o
 * "padrão" existiria apenas enquanto o usuário usasse o formulário. Uma
 * importação de CSV ou uma requisição direta o fura.
 *
 * **Não é uma tabela oficial do TCESP.** As categorias transmitidas são as da
 * `CATEGORIA_DESPESA` (`categoria_despesas_tipo`, 88 códigos); estas aqui são a
 * rubrica interna do plano, que o Tribunal não padroniza. Por isso o CSV
 * continua aceitando qualquer rubrica: órgão com plano próprio não pode ficar
 * de fora por não seguir este desenho.
 *
 * As linhas marcadas "(especificar)" existem no modelo com valor zero — quem
 * as usa escreve a descrição ao lado. Mantidas para o plano digitado ficar
 * igual ao papel que o órgão já preenche.
 */
export interface GrupoPlanoPadrao {
  /** Numeração do modelo: "1", "2"... Aparece na tela, não é gravada. */
  numero: string;
  categoria: string;
  subcategorias: string[];
}

export const PLANO_PADRAO: GrupoPlanoPadrao[] = [
  {
    numero: '1',
    categoria: 'Recursos Humanos',
    subcategorias: [
      'Salários',
      'Encargos',
      'Benefícios',
      'Provisionamento (13º e férias)',
      'Provisionamento (rescisões)',
      'Outras despesas de Recursos Humanos (especificar)',
    ],
  },
  {
    // O modelo repete "Recursos Humanos" no grupo 2, para separar o pessoal
    // contratado como terceiro. Preservado como está no papel: renomear aqui
    // faria o plano digitado divergir do documento que o órgão assina.
    numero: '2',
    categoria: 'Recursos Humanos (terceiros)',
    subcategorias: ['Autônomos', 'Pessoas Jurídicas (Equipe multidisciplinar)'],
  },
  { numero: '3', categoria: 'Serviços Médicos', subcategorias: ['Serviços Médicos'] },
  { numero: '4', categoria: 'Medicamentos', subcategorias: ['Medicamentos'] },
  {
    numero: '5',
    categoria: 'Materiais Médico-Hospitalares',
    subcategorias: ['Materiais Médico-Hospitalares e Odontológicos'],
  },
  { numero: '6', categoria: 'Gêneros Alimentícios', subcategorias: ['Gêneros Alimentícios'] },
  { numero: '7', categoria: 'Combustível', subcategorias: ['Combustível'] },
  {
    numero: '8',
    categoria: 'Outros Materiais de Consumo',
    subcategorias: [
      'Materiais de Escritório',
      'Materiais de Limpeza',
      'Suprimentos de Informática',
      'Uniformes e Equipamentos de Proteção Individual (EPIs)',
      'Outros Materiais de Consumo (especificar)',
    ],
  },
  {
    numero: '9',
    categoria: 'Outros Serviços de Terceiros',
    subcategorias: [
      'Assessoria/Consultoria Contábil',
      'Assessoria/Consultoria Jurídica',
      'Outras Assessorias/Consultorias (especificar)',
      'Educação Continuada',
      'Serviços e Sistemas de Informática',
      'Serviços Gráficos',
      'Serviços de Zeladoria (Limpeza/Jardinagem)',
      'Manutenção Predial',
      'Manutenção de Mobiliários e Equipamentos',
      'Controle de Pragas',
      'Ponto Biométrico/Controle de Frequência',
    ],
  },
  { numero: '10', categoria: 'Locação de Imóveis', subcategorias: ['Locação de Imóveis'] },
  {
    numero: '11',
    categoria: 'Locações Diversas',
    subcategorias: [
      'Locação de Mobiliários',
      'Locação de Equipamentos',
      'Locação de Veículos',
      'Serviço de Motoboy',
    ],
  },
  {
    numero: '12',
    categoria: 'Utilidades Públicas',
    subcategorias: ['Água e Esgoto', 'Energia Elétrica', 'Telefone', 'Internet', 'Gás'],
  },
  {
    numero: '13',
    categoria: 'Bens e Materiais Permanentes',
    subcategorias: ['Bens e Materiais Permanentes'],
  },
  { numero: '14', categoria: 'Obras', subcategorias: ['Obras'] },
  {
    numero: '15',
    categoria: 'Despesas Financeiras e Bancárias',
    subcategorias: ['Despesas Financeiras e Bancárias'],
  },
  {
    numero: '16',
    categoria: 'Outras Despesas',
    subcategorias: [
      'Serviço de Apoio a Gestão',
      'Serviço de Departamento Pessoal/RH',
      'Serviço de Prestação de Contas',
    ],
  },
];

/** Todos os pares categoria+subcategoria do padrão, achatados. */
export const RUBRICAS_PADRAO: { categoria: string; subcategoria: string }[] = PLANO_PADRAO.flatMap(
  (g) => g.subcategorias.map((s) => ({ categoria: g.categoria, subcategoria: s })),
);

/** A rubrica pertence ao padrão? Usado para validar o que a tela envia. */
export function ehRubricaPadrao(categoria: string, subcategoria: string): boolean {
  return RUBRICAS_PADRAO.some(
    (r) => r.categoria === categoria && r.subcategoria === subcategoria,
  );
}
