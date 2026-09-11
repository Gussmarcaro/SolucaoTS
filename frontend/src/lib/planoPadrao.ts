/**
 * Estrutura padrão do Plano de Aplicação — **espelho** de
 * `backend/src/core/planoAplicacao/planoPadrao.ts`.
 *
 * Duplicado de propósito, como as regras da agenda e a aritmética do rateio: a
 * grade precisa desenhar as 16 seções sem ida ao servidor, e o servidor precisa
 * recusar rubrica fora do padrão que chegue por outro caminho. Se divergirem, a
 * tela oferece uma rubrica que a gravação recusa — e o erro aparece só ao
 * salvar o plano inteiro.
 */
export interface GrupoPlanoPadrao {
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
