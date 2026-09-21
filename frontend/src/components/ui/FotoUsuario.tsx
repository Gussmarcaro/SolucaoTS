import { useRef, useState } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { Avatar } from './Avatar';

/**
 * Escolher, reduzir e enviar a foto do usuário.
 *
 * **O redimensionamento no navegador é o ponto deste componente**, não um
 * refinamento. A foto não é um anexo que se abre uma vez: ela carrega em toda
 * tela, na barra superior. Uma foto de celular tem 4 MB e 4000 px de lado;
 * exibida num quadrado de 32 px, 3,96 MB daquilo é desperdício puro — pago
 * pelo usuário, em cada navegação, na conexão de um órgão público.
 *
 * Reduzida a 256×256 JPEG aqui, fica em 20–40 KB. O servidor recusa acima de
 * 512 KB, mas esse limite existe para quem burlar este caminho, não para
 * acomodá-lo.
 */

/** Lado do quadrado final. 256 cobre o maior uso (96 px) com folga em telas 2×. */
const LADO = 256;

/**
 * Recorta no centro e reduz, devolvendo JPEG.
 *
 * O recorte quadrado acontece **antes** da redução, e é o que evita a foto
 * achatada: o avatar é redondo/quadrado em toda a interface, e uma imagem
 * retangular esticada para caber deforma o rosto.
 */
async function reduzir(arquivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);
  const lado = Math.min(bitmap.width, bitmap.height);
  const x = (bitmap.width - lado) / 2;
  const y = (bitmap.height - lado) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = LADO;
  canvas.height = LADO;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível processar a imagem.');
  ctx.drawImage(bitmap, x, y, lado, lado, 0, 0, LADO, LADO);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Não foi possível processar a imagem.'))),
      'image/jpeg',
      0.85,
    );
  });
}

export interface FotoUsuarioProps {
  nome: string;
  usuarioId?: string | null;
  fotoVersao?: string | null;
  /** Recebe o arquivo já reduzido. Quem grava é a tela, que sabe a rota. */
  onEnviar: (arquivo: File) => Promise<void>;
  onRemover: () => Promise<void>;
  desabilitado?: boolean;
  /**
   * Prévia local, para o cadastro **novo**.
   *
   * Ali ainda não existe id de usuário, então não há foto a buscar no servidor
   * — e sem isto a pessoa escolheria a imagem e continuaria vendo as iniciais,
   * sem saber se o arquivo foi aceito. Quando vem preenchida, substitui o
   * avatar.
   */
  previaUrl?: string | null;
}

export function FotoUsuario({
  nome,
  usuarioId,
  fotoVersao,
  onEnviar,
  onRemover,
  desabilitado = false,
  previaUrl = null,
}: FotoUsuarioProps) {
  const entrada = useRef<HTMLInputElement>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function escolher(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro(null);
    setOcupado(true);
    try {
      const reduzida = await reduzir(arquivo);
      await onEnviar(new File([reduzida], 'foto.jpg', { type: 'image/jpeg' }));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar a foto.');
    } finally {
      setOcupado(false);
      // Zera a entrada: sem isto, escolher o **mesmo** arquivo de novo (depois
      // de um erro) não dispara `change`, e o botão parece morto.
      if (entrada.current) entrada.current.value = '';
    }
  }

  async function remover() {
    setErro(null);
    setOcupado(true);
    try {
      await onRemover();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível remover a foto.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      {previaUrl ? (
        <img
          src={previaUrl}
          alt={nome}
          className="inline-flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ink-200 object-cover dark:bg-ink-700"
        />
      ) : (
        <Avatar nome={nome} usuarioId={usuarioId} fotoVersao={fotoVersao} tamanho="xl" />
      )}

      <div className="flex flex-col gap-2">
        <input
          ref={entrada}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => void escolher(e.target.files?.[0])}
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => entrada.current?.click()}
            disabled={desabilitado || ocupado}
            className="focus-ring inline-flex items-center gap-2 rounded-xl border border-ink-200 px-3 py-1.5 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50 disabled:opacity-50 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-800"
          >
            {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {fotoVersao || previaUrl ? 'Trocar foto' : 'Escolher foto'}
          </button>

          {(fotoVersao || previaUrl) && (
            <button
              type="button"
              onClick={() => void remover()}
              disabled={desabilitado || ocupado}
              className="focus-ring inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" />
              Remover
            </button>
          )}
        </div>

        <p className="text-xs text-ink-400">
          JPG, PNG ou WebP. A imagem é recortada no centro e reduzida a {LADO}×{LADO} aqui mesmo —
          não é preciso preparar o arquivo antes.
        </p>
        {erro && <p className="text-xs text-red-600 dark:text-red-400">{erro}</p>}
      </div>
    </div>
  );
}
