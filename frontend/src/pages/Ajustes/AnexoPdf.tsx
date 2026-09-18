import { useRef, useState } from 'react';
import { ExternalLink, FileText, Trash2, Upload } from 'lucide-react';
import {
  abrirDocumentoAjuste,
  removerDocumentoAjuste,
  type DocumentoAjuste,
} from '@/services/ajustes.service';
import { extrairMensagemErro } from '@/services/http';

/** Teto do anexo. Espelha o limite do multer e o do caso de uso no servidor. */
export const MAX_ANEXO = 5 * 1024 * 1024;

export function tamanhoLegivel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export interface Anexado {
  nome: string;
  tamanho: number;
}

/**
 * Um anexo PDF do ajuste.
 *
 * O ajuste tem dois documentos — o Termo de Ciência e o instrumento assinado —
 * e eles se comportam igual: escolher, ver o que já está lá, abrir, remover.
 * Repetir as trinta linhas de interface duas vezes seria dar duas chances de
 * divergirem, e a segunda cópia é sempre a que esquece um estado.
 *
 * **O arquivo escolhido não sobe aqui.** Ele fica no estado do formulário e é
 * enviado depois de salvar, porque a rota precisa do id do ajuste — que, num
 * cadastro novo, só existe depois da gravação. Quem envia é o `AjusteForm`.
 */
export function AnexoPdf({
  ajusteId,
  documento,
  rotulo,
  arquivo,
  onArquivo,
  anexado,
  onAnexado,
}: {
  /** Ausente enquanto o ajuste não foi criado: sem id não há o que abrir nem remover. */
  ajusteId?: string;
  documento: DocumentoAjuste;
  /** "do termo", "do ajuste celebrado" — entra nas frases da tela. */
  rotulo: string;
  arquivo: File | null;
  onArquivo: (f: File | null) => void;
  anexado: Anexado | null;
  onAnexado: (a: Anexado | null) => void;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  function escolher(f: File | null) {
    setErro(null);
    if (!f) return onArquivo(null);
    // Conferido aqui e no servidor. Aqui é para o usuário saber antes de
    // esperar um upload que vai ser recusado; lá é o que de fato protege.
    if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) {
      onArquivo(null);
      return setErro(`O arquivo ${rotulo} precisa ser um PDF.`);
    }
    if (f.size > MAX_ANEXO) {
      onArquivo(null);
      return setErro(`O arquivo ${rotulo} excede o limite de 5 MB.`);
    }
    onArquivo(f);
  }

  async function remover() {
    setErro(null);
    // Só existe no servidor o que já foi salvo. Num ajuste novo, "remover" é
    // apenas desfazer a escolha — não há nada gravado para apagar.
    if (ajusteId && anexado) {
      try {
        await removerDocumentoAjuste(ajusteId, documento);
      } catch (e) {
        return setErro(extrairMensagemErro(e, 'Não foi possível remover o arquivo.'));
      }
    }
    onAnexado(null);
    onArquivo(null);
    if (input.current) input.current.value = '';
  }

  return (
    <>
      <span className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-300">
        Anexar arquivo PDF
      </span>

      {anexado && !arquivo ? (
        <div className="flex items-center gap-2 rounded-xl border border-ink-200 bg-ink-50/60 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-800/40">
          <FileText className="h-4 w-4 shrink-0 text-ink-400" />
          <span className="flex-1 truncate text-ink-700 dark:text-ink-200" title={anexado.nome}>
            {anexado.nome}
          </span>
          {anexado.tamanho > 0 && (
            <span className="text-xs text-ink-400">{tamanhoLegivel(anexado.tamanho)}</span>
          )}
          {ajusteId && (
            <button
              type="button"
              title="Abrir PDF"
              onClick={() =>
                abrirDocumentoAjuste(ajusteId, documento).catch(() =>
                  setErro('Não foi possível abrir o PDF.'),
                )
              }
              className="focus-ring rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            title="Remover"
            onClick={remover}
            className="focus-ring rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-ink-300 px-3 py-2 text-sm text-ink-500 transition-colors hover:border-brand-400 hover:text-ink-700 dark:border-ink-600 dark:text-ink-400 dark:hover:text-ink-200">
          <Upload className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">
            {arquivo ? arquivo.name : `Selecionar o PDF ${rotulo}...`}
          </span>
          {arquivo && <span className="text-xs text-ink-400">{tamanhoLegivel(arquivo.size)}</span>}
          <input
            ref={input}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            onChange={(e) => escolher(e.target.files?.[0] ?? null)}
          />
        </label>
      )}

      {erro && <p className="mt-1 text-xs font-medium text-red-500">{erro}</p>}
    </>
  );
}
