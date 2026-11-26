import { http } from './http';

export interface Noticia {
  titulo: string;
  link: string;
  resumo: string;
  /** `aaaa-mm-dd` */
  data: string | null;
  area: string | null;
  numero: string | null;
  /** Fala de Audesp, Fase V, terceiro setor ou repasses. */
  destaque: boolean;
}

export interface Manchetes {
  itens: Noticia[];
  lidoEm: string | null;
  desatualizado: boolean;
}

export interface NoticiasTcesp {
  comunicados: Manchetes;
  noticias: Manchetes;
}

/**
 * Comunicados e notícias do site do TCESP. Quem visita o site é o servidor, de
 * meia em meia hora; esta chamada só lê o que ele guardou.
 */
export async function noticiasTcesp(): Promise<NoticiasTcesp> {
  const { data } = await http.get<NoticiasTcesp>('/dashboard/noticias');
  return data;
}
