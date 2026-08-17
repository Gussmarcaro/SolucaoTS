/**
 * Painel de Transparência — o que a Lei 13.019/2014 (art. 10) manda o órgão
 * publicar sobre cada parceria: data e identificação do instrumento, a OSC e
 * seu CNPJ, o objeto, o valor, a vigência e a situação da prestação de contas.
 *
 * A tela é interna. Ela não publica nada sozinha: reúne o que precisa ir ao
 * portal e aponta o que ainda falta — a publicação em si continua sendo ato do
 * órgão, e afirmar o contrário daria uma sensação falsa de conformidade.
 */
export interface ParceriaPublicavel {
  ajusteId: string;
  codigoAjuste: string;
  numero: string | null;
  tipoAjuste: string;
  objeto: string;
  entidadeNome: string;
  entidadeCnpj: string;
  /** Órgão concessor da parceria — cabeçalho do documento publicado. */
  orgaoNome: string | null;
  valorGlobal: number;
  dataAssinatura: string;
  vigenciaInicial: string | null;
  vigenciaFinal: string | null;
  /** Onde e quando o extrato foi publicado; vazio = pendência do art. 10. */
  publicacaoLocal: string | null;
  publicacaoData: string | null;
  publicacaoLink: string | null;
  /** Situação da prestação mais recente, ou null quando não há nenhuma. */
  prestacaoStatus: string | null;
  prestacaoAno: number | null;
  /** O que impede esta parceria de estar publicada conforme o art. 10. */
  pendencias: string[];
}

export interface ITransparenciaRepository {
  parcerias(): Promise<Omit<ParceriaPublicavel, 'pendencias'>[]>;
}

export class ListarTransparenciaUseCase {
  constructor(private readonly repo: ITransparenciaRepository) {}

  async execute(): Promise<ParceriaPublicavel[]> {
    const parcerias = await this.repo.parcerias();

    return parcerias.map((p) => ({
      ...p,
      pendencias: this.pendenciasDe(p),
    }));
  }

  /**
   * O que falta para a parceria estar publicada como a lei pede.
   *
   * A lista é o valor da tela: uma relação de parcerias qualquer sistema
   * produz — dizer **qual delas está irregular** é o que evita a notificação
   * do Tribunal.
   */
  private pendenciasDe(p: Omit<ParceriaPublicavel, 'pendencias'>): string[] {
    const faltas: string[] = [];

    if (!p.publicacaoData) faltas.push('Extrato do ajuste sem data de publicação');
    if (!p.publicacaoLink && !p.publicacaoLocal)
      faltas.push('Sem veículo nem endereço da publicação');
    if (!p.objeto?.trim()) faltas.push('Objeto não descrito');
    if (!p.vigenciaFinal) faltas.push('Vigência final não informada');

    // A situação da prestação faz parte do que se publica (art. 10, VII).
    if (!p.prestacaoStatus) faltas.push('Nenhuma prestação de contas registrada');
    else if (p.prestacaoStatus === 'REJEITADO')
      faltas.push('Prestação rejeitada pelo TCESP — a situação publicada precisa refletir isso');

    return faltas;
  }
}
