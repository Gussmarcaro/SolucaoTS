import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { FormularioNovo } from '@/components/ui/LabelCampo';
import type { OpcaoCombo } from '@/components/ui/Combobox';
import { listarAjustes } from '@/services/ajustes.service';
import { ajustesVigentes, atualizarRateio, criarRateio } from '@/services/rateios.service';
import { extrairMensagemErro } from '@/services/http';
import { numeroParaMascaraMoeda } from '@/lib/masks';
import {
  METODOS,
  calcularRateio,
  definicaoDoMetodo,
  temQuadro,
  type MetodoRateio,
  type Rateio,
  type RateioPayload,
} from '@/types/rateio';
import { QuadroRateio, baseNumerica, type LinhaQuadro } from './QuadroRateio';

interface Props {
  rateio: Rateio | null;
  onSuccess: () => void;
  onCancel: () => void;
}

interface AjusteResumo {
  id: string;
  codigoAjuste: string;
  entidadeNome: string;
  objeto: string;
}

/**
 * Cadastro do Rateio.
 *
 * O corpo muda com o método, mas **não há um formulário por método**: o quadro
 * é o mesmo componente, e o que varia — rótulo da coluna, formato do campo,
 * rótulo do total — vem da definição do método. Um método novo entra no
 * catálogo e a tela o atende sem alteração.
 */
export function RateioForm({ rateio, onSuccess, onCancel }: Props) {
  const [titulo, setTitulo] = useState(rateio?.titulo ?? '');
  const [inicio, setInicio] = useState(rateio?.vigenciaInicio ?? '');
  const [fim, setFim] = useState(rateio?.vigenciaFim ?? '');
  const [metodo, setMetodo] = useState<MetodoRateio>(rateio?.metodo ?? 'RECEITA');
  const [descricaoMetodo, setDescricaoMetodo] = useState(rateio?.descricaoMetodo ?? '');
  const [observacoes, setObservacoes] = useState(rateio?.observacoes ?? '');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const [ajustes, setAjustes] = useState<AjusteResumo[]>([]);
  const [linhas, setLinhas] = useState<LinhaQuadro[]>([]);

  const definicao = definicaoDoMetodo(metodo)!;

  // Catálogo de ajustes: alimenta o lookup e dá nome às linhas do quadro.
  useEffect(() => {
    let vivo = true;
    listarAjustes({ page: 1, pageSize: 500, orderBy: 'codigoAjuste', orderDir: 'asc' })
      .then((r) => {
        if (!vivo) return;
        setAjustes(
          r.data.map((a) => ({
            id: a.id,
            codigoAjuste: a.codigoAjuste,
            entidadeNome: a.entidadeNome,
            objeto: a.objeto,
          })),
        );
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, []);

  // Linhas do rateio em edição, assim que o catálogo chega (é dele que sai o
  // código do ajuste). O participante já traz os nomes, então não depende dele.
  useEffect(() => {
    if (!rateio) return;
    setLinhas(
      rateio.participantes.map((p) => ({
        ajusteId: p.ajusteId,
        codigo: p.ajusteCodigo,
        descricao: p.entidadeNome || p.ajusteObjeto,
        base:
          definicaoDoMetodo(rateio.metodo)?.formato === 'MOEDA'
            ? numeroParaMascaraMoeda(p.base)
            : String(p.base),
      })),
    );
  }, [rateio]);

  const noQuadro = useMemo(() => new Set(linhas.map((l) => l.ajusteId)), [linhas]);

  // O lookup só oferece quem ainda não está no quadro — é o que impede a
  // duplicidade antes de o banco recusar com uma mensagem que não ajuda.
  const opcoes: OpcaoCombo[] = ajustes
    .filter((a) => !noQuadro.has(a.id))
    .map((a) => ({ value: a.id, label: a.codigoAjuste, sub: a.entidadeNome }));

  const linhaDe = (a: AjusteResumo): LinhaQuadro => ({
    ajusteId: a.id,
    codigo: a.codigoAjuste,
    descricao: a.entidadeNome || a.objeto,
    base: definicao.formato === 'MOEDA' ? '' : '',
  });

  function adicionar(ajusteId: string) {
    const a = ajustes.find((x) => x.id === ajusteId);
    if (!a || noQuadro.has(ajusteId)) return;
    setLinhas((atual) => [...atual, linhaDe(a)]);
  }

  async function carregarVigentes() {
    setCarregando(true);
    setErro(null);
    try {
      // Vigentes na data inicial do período, quando informada — é o recorte que
      // faz sentido: o rateio vale a partir dali.
      const ids = new Set((await ajustesVigentes(inicio || undefined)).map((x) => x.id));
      const novos = ajustes.filter((a) => ids.has(a.id) && !noQuadro.has(a.id));
      if (!novos.length) {
        setErro('Nenhum ajuste vigente fora do quadro para acrescentar.');
        return;
      }
      setLinhas((atual) => [...atual, ...novos.map(linhaDe)]);
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível carregar os ajustes vigentes.'));
    } finally {
      setCarregando(false);
    }
  }

  // Trocar de método zera o quadro quando o formato da base muda: reais viram
  // "quantidade de colaboradores" sem querer, e o número fica errado em silêncio.
  function trocarMetodo(novo: MetodoRateio) {
    const antes = definicaoDoMetodo(metodo)?.formato;
    const depois = definicaoDoMetodo(novo)?.formato;
    if (antes !== depois) setLinhas((atual) => atual.map((l) => ({ ...l, base: '' })));
    setMetodo(novo);
  }

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (titulo.trim().length < 3) return setErro('Informe o título do rateio.');
    if (!inicio) return setErro('Informe a data inicial do período.');
    if (!fim) return setErro('Informe a data final do período.');
    if (fim < inicio) return setErro('O fim do período é anterior ao início.');
    if (metodo === 'OUTROS' && !descricaoMetodo.trim())
      return setErro('Para o método "Outros", descreva o critério adotado.');

    const participantes = temQuadro(metodo)
      ? linhas.map((l) => ({ ajusteId: l.ajusteId, base: baseNumerica(l, definicao.formato) }))
      : [];

    if (temQuadro(metodo)) {
      if (!participantes.length) return setErro('Inclua ao menos um ajuste no quadro de rateio.');
      const { totalBase } = calcularRateio(participantes);
      if (totalBase <= 0)
        return setErro(
          metodo === 'COLABORADORES'
            ? 'O total de colaboradores precisa ser maior que zero.'
            : 'O total da base precisa ser maior que zero.',
        );
      if (metodo === 'RECEITA' && participantes.some((p) => p.base <= 0))
        return setErro('A receita de cada ajuste precisa ser maior que zero.');
    }

    const payload: RateioPayload = {
      titulo: titulo.trim(),
      vigenciaInicio: inicio,
      vigenciaFim: fim,
      metodo,
      descricaoMetodo: descricaoMetodo.trim() || null,
      observacoes: observacoes.trim() || null,
      participantes,
    };

    setSalvando(true);
    try {
      if (rateio) await atualizarRateio(rateio.id, payload);
      else await criarRateio(payload);
      onSuccess();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível salvar o rateio.'));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <FormularioNovo novo={!rateio}>
      <form onSubmit={submeter} className="space-y-4">
        {erro && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {erro}
          </div>
        )}

        <fieldset className="rounded-xl border border-ink-200 px-3 pb-3 pt-1 dark:border-ink-700">
          <legend className="px-1 text-[13px] font-normal text-ink-600 dark:text-ink-300">
            Dados do Rateio
          </legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
            <div className="sm:col-span-12">
              <Input
                label="Título do Rateio *"
                name="titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="ex.: Rateio das Despesas Administrativas"
              />
            </div>
            <div className="sm:col-span-3">
              <Input label="Data Inicial *" name="inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </div>
            <div className="sm:col-span-3">
              <Input label="Data Final *" name="fim" type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
            </div>
            <div className="sm:col-span-6">
              <Select
                label="Método *"
                name="metodo"
                value={metodo}
                onChange={(e) => trocarMetodo(e.target.value as MetodoRateio)}
                options={METODOS.map((m) => ({ value: m.id, label: m.rotulo }))}
              />
            </div>
          </div>
        </fieldset>

        {/* O corpo muda com o método — e é o mesmo componente para todos os que
            têm quadro. Ver QuadroRateio. */}
        {temQuadro(metodo) ? (
          <QuadroRateio
            metodo={definicao}
            linhas={linhas}
            onChange={setLinhas}
            opcoes={opcoes}
            onAdicionar={adicionar}
            onCarregarVigentes={carregarVigentes}
            carregando={carregando}
          />
        ) : (
          <fieldset className="rounded-xl border border-ink-200 px-3 pb-3 pt-1 dark:border-ink-700">
            <legend className="px-1 text-[13px] font-normal text-ink-600 dark:text-ink-300">
              Critério adotado
            </legend>
            <p className="mb-3 text-xs text-ink-400">
              O comportamento deste método ainda não foi definido. Descreva o critério para que o
              rateio fique documentado; o quadro de distribuição entra quando a regra existir.
            </p>
            <div className="space-y-4">
              <Input
                label="Descrição do método *"
                name="descricaoMetodo"
                value={descricaoMetodo}
                onChange={(e) => setDescricaoMetodo(e.target.value)}
                placeholder="ex.: proporcional à área ocupada por cada unidade"
              />
              <Input
                label="Observações"
                name="observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>
          </fieldset>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando}>
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
            {salvando ? 'Salvando...' : rateio ? 'Salvar Alterações' : 'Cadastrar Rateio'}
          </Button>
        </div>
      </form>
    </FormularioNovo>
  );
}
