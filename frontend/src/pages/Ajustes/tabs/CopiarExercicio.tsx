import { useEffect, useState } from 'react';
import { AlertCircle, Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { extrairMensagemErro } from '@/services/http';

/**
 * Copiar de um exercício para outro, com reajuste.
 *
 * Serve ao Plano e ao Cronograma, que têm o mesmo problema: a parceria se
 * renova todo ano e o conteúdo muda pouco — reajuste aqui, rubrica nova ali.
 * Redigitar 40 rubricas (ou 480 células, no cronograma) é o tipo de trabalho
 * que faz alguém voltar para a planilha, e um sistema que dá mais trabalho que
 * a planilha perde para ela.
 *
 * Um componente para os dois porque a diferença é só de rótulo e de serviço; o
 * diálogo, a validação e o aviso de substituição são idênticos, e mantê-los em
 * dois lugares garantiria que divergissem.
 */
export function CopiarExercicio({
  rotulo,
  carregarExercicios,
  copiar,
  onCopiado,
}: {
  /** "plano" ou "cronograma" — entra nas frases do diálogo. */
  rotulo: string;
  carregarExercicios: () => Promise<number[]>;
  copiar: (p: { de: number; para: number; reajustePercentual: number }) => Promise<unknown>;
  onCopiado: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [exercicios, setExercicios] = useState<number[]>([]);
  const [de, setDe] = useState('');
  const [para, setPara] = useState('');
  const [reajuste, setReajuste] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [copiando, setCopiando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    let vivo = true;
    carregarExercicios()
      .then((anos) => {
        if (!vivo) return;
        setExercicios(anos);
        // A origem é o exercício mais recente, e o destino o ano seguinte: é o
        // que se quer em quase toda renovação, e poupa dois cliques.
        const recente = anos[0];
        if (recente) {
          setDe(String(recente));
          setPara(String(recente + 1));
        }
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [aberto, carregarExercicios]);

  const destinoExiste = exercicios.includes(Number(para));

  async function confirmar() {
    setErro(null);
    const a = Number(de);
    const b = Number(para);
    if (!a || !b) return setErro('Informe os dois exercícios.');
    if (a === b) return setErro('O destino precisa ser diferente da origem.');

    setCopiando(true);
    try {
      await copiar({
        de: a,
        para: b,
        reajustePercentual: reajuste ? Number(reajuste.replace(',', '.')) : 0,
      });
      setAberto(false);
      onCopiado();
    } catch (e) {
      setErro(extrairMensagemErro(e, `Não foi possível copiar o ${rotulo}.`));
    } finally {
      setCopiando(false);
    }
  }

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setAberto(true)}>
        <Copy className="h-4 w-4" />
        Copiar de outro exercício
      </Button>

      <Modal
        open={aberto}
        onClose={() => setAberto(false)}
        title={`Copiar ${rotulo} de outro exercício`}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAberto(false)} disabled={copiando}>
              Cancelar
            </Button>
            <Button onClick={confirmar} disabled={copiando}>
              {copiando && <Loader2 className="h-4 w-4 animate-spin" />}
              Copiar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {erro && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {exercicios.length === 0 ? (
            <p className="text-sm text-ink-500 dark:text-ink-400">
              Não há {rotulo} cadastrado em nenhum exercício para copiar.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Select
                  label="Copiar de *"
                  name="de"
                  value={de}
                  onChange={(e) => setDe(e.target.value)}
                  options={exercicios.map((a) => ({ value: String(a), label: String(a) }))}
                />
                <Input
                  label="Para o exercício *"
                  name="para"
                  value={para}
                  onChange={(e) => setPara(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  inputMode="numeric"
                />
                <Input
                  label="Reajuste (%)"
                  name="reajuste"
                  value={reajuste}
                  onChange={(e) => setReajuste(e.target.value.replace(/[^\d,.-]/g, ''))}
                  placeholder="0"
                  inputMode="decimal"
                  hint="Ex.: 5 sobe 5%."
                />
              </div>

              {/* O aviso só aparece quando há o que perder. Avisar sempre
                  ensinaria a clicar em "Copiar" sem ler. */}
              {destinoExiste && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Já existe {rotulo} em <strong>{para}</strong>. A cópia vai{' '}
                    <strong>substituí-lo</strong>. Os demais exercícios não são tocados.
                  </span>
                </div>
              )}

              <p className="text-xs text-ink-400">
                O reajuste é aplicado sobre cada valor, e os demais exercícios ficam como estão.
                Depois de copiar, revise as rubricas: contrato novo costuma trazer mudança que o
                percentual não cobre.
              </p>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
