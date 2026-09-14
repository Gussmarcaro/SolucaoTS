import { useEffect, useState } from 'react';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/Combobox';
import { SelectDominio } from '@/components/ui/SelectDominio';
import { IconBtn } from '@/pages/PrestacaoContas/blocos/_ui';
import { BANCO, CONTA_TIPO, FONTE_RECURSO } from '@/lib/dominiosFaseV';
import { apenasDigitos } from '@/lib/masks';
import { contasApi } from '@/services/contasBancarias.service';
import type { ContaBancaria } from '@/types/contaBancaria';
import type { ContaBancariaAjuste } from '@/types/ajuste';

interface Props {
  fontes: number[];
  onFontes: (v: number[]) => void;
  contas: ContaBancariaAjuste[];
  onContas: (v: ContaBancariaAjuste[]) => void;
}

const rotuloDominio = (opcoes: { value: string; label: string }[], codigo: number | null) =>
  opcoes.find((o) => o.value === String(codigo))?.label ?? String(codigo ?? '');

const rotuloBanco = (codigo: number) => rotuloDominio(BANCO, codigo);

/** Como a conta do ajuste se descreve por extenso, venha do cadastro ou não. */
function descreverConta(c: ContaBancariaAjuste): string {
  const tipo = CONTA_TIPO.find((o) => o.value === String(c.contaTipo))?.label;
  const base = `${rotuloBanco(c.banco)} · Ag. ${c.agencia} · Conta ${c.conta}`;
  return tipo ? `${base} (${tipo})` : base;
}

/**
 * Fontes de recurso e contas bancárias do ajuste.
 *
 * O que se ganha declarando isto aqui: no lançamento do pagamento, em vez das
 * 16 fontes da tabela e de banco/agência/conta digitados à mão, aparecem só as
 * do ajuste. Fonte errada não é recusada no envio — o código existe na tabela —,
 * então sem esta lista o erro só apareceria na análise do Tribunal.
 *
 * **A conta não se digita mais aqui: escolhe-se do cadastro do órgão**
 * (Execução → Financeiro → Contas Bancárias). A mesma conta servia a vários
 * ajustes e era redigitada em cada um; um dígito trocado num deles não
 * aparecia como erro, aparecia como conciliação que deixou de casar. O que
 * continua sendo do ajuste — e só dele — é a **fonte de recurso que entra na
 * conta**: a mesma conta pode receber fontes diferentes em ajustes diferentes.
 *
 * As fontes são **obrigatórias**; as contas, não. Restringir a conta do
 * pagamento só faz sentido quando há contas cadastradas, e exigi-las trancaria
 * o ajuste de quem ainda não as tem.
 */
export function FontesEContas({ fontes, onFontes, contas, onContas }: Props) {
  const [cadastro, setCadastro] = useState<ContaBancaria[]>([]);
  const [falhouCadastro, setFalhouCadastro] = useState(false);

  useEffect(() => {
    let vivo = true;
    // Só as ativas: conta inativada saiu de uso, e oferecê-la para um ajuste
    // novo desfaria a inativação pelo caminho de trás.
    contasApi
      .listar(true)
      .then((r) => vivo && setCadastro(r))
      .catch(() => vivo && setFalhouCadastro(true));
    return () => {
      vivo = false;
    };
  }, []);

  const disponiveis = FONTE_RECURSO.filter((o) => !fontes.includes(Number(o.value)));

  /** As fontes que a conta pode declarar — só as acrescentadas acima. */
  const opcoesFonteDaConta = FONTE_RECURSO.filter((o) => fontes.includes(Number(o.value)));

  const alterarConta = (i: number, parcial: Partial<ContaBancariaAjuste>) =>
    onContas(contas.map((c, j) => (j === i ? { ...c, ...parcial } : c)));

  /*
   * Escolher do cadastro **copia** banco, agência, conta e tipo para o ajuste.
   *
   * Não é redundância: os campos soltos são a fotografia do que o ajuste
   * declarou, e é ela que vai ao Tribunal. Renomear ou corrigir a conta no
   * cadastro depois não pode reescrever um ajuste já transmitido.
   *
   * A agência vira número aqui porque a coluna do ajuste é `Int` — dívida
   * antiga, que o cadastro não repete (lá ela é texto, com dígito verificador
   * e zero à esquerda preservados).
   */
  const escolherDoCadastro = (i: number, contaBancariaId: string) => {
    const fonte = cadastro.find((x) => x.id === contaBancariaId);
    if (!fonte) return alterarConta(i, { contaBancariaId: null });
    alterarConta(i, {
      contaBancariaId: fonte.id,
      banco: fonte.banco,
      agencia: Number(apenasDigitos(fonte.agencia)) || 0,
      conta: fonte.conta,
      contaTipo: fonte.contaTipo,
      apelido: fonte.apelido,
    });
  };

  /*
   * Remover uma fonte de cima deixaria órfã a conta que a declarava — e o
   * servidor recusaria o ajuste inteiro na hora de salvar, apontando uma conta
   * que a pessoa nem estava editando. Limpar aqui faz o campo pedir a fonte de
   * novo, no lugar certo e na hora do gesto.
   */
  const removerFonte = (f: number) => {
    onFontes(fontes.filter((x) => x !== f));
    onContas(contas.map((c) => (c.fonteRecursoTipo === f ? { ...c, fonteRecursoTipo: null } : c)));
  };

  return (
    <div className="space-y-5">
      {/* ---- Fontes ---- */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1 sm:max-w-md">
            <SelectDominio
              label="Acrescentar fonte de recurso"
              name="novaFonte"
              value=""
              onChange={(v) => v && onFontes([...fontes, Number(apenasDigitos(v))].sort((a, b) => a - b))}
              options={disponiveis}
            />
          </div>
          {!disponiveis.length && (
            <p className="pb-2.5 text-xs text-ink-400">Todas as fontes já foram acrescentadas.</p>
          )}
        </div>

        {fontes.length === 0 ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Nenhuma fonte informada. O ajuste precisa de ao menos uma — é ela que o pagamento vai
            poder usar.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {fontes.map((f) => (
              <li
                key={f}
                className="flex items-center gap-2 rounded-lg border border-ink-200 bg-ink-50/70 py-1 pl-2.5 pr-1 text-xs text-ink-700 dark:border-ink-700 dark:bg-ink-800/40 dark:text-ink-200"
              >
                <span className="max-w-[320px] truncate" title={rotuloDominio(FONTE_RECURSO, f)}>
                  {rotuloDominio(FONTE_RECURSO, f)}
                </span>
                <IconBtn title="Remover fonte" danger onClick={() => removerFonte(f)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </IconBtn>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ---- Contas ---- */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-ink-700 dark:text-ink-200">Contas bancárias</p>
            <p className="text-xs text-ink-400">
              Opcionais, e <strong>escolhidas do cadastro do órgão</strong> — não se digita o
              número aqui. Cada conta declara <strong>a fonte de recurso que entra nela</strong>,
              e é isso que faz o pagamento saber de onde saiu o dinheiro. A{' '}
              <strong>corrente e a aplicação</strong> da mesma conta são duas linhas do cadastro,
              distinguidas pelo <strong>tipo</strong>.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              onContas([
                ...contas,
                {
                  contaBancariaId: null,
                  banco: 0,
                  agencia: 0,
                  conta: '',
                  contaTipo: null,
                  fonteRecursoTipo: null,
                  apelido: null,
                },
              ])
            }
          >
            <Plus className="h-4 w-4" />
            Acrescentar conta
          </Button>
        </div>

        {falhouCadastro && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Não foi possível carregar o cadastro de contas. As contas já vinculadas continuam
            aqui; para acrescentar outra, recarregue a página.
          </p>
        )}

        {cadastro.length === 0 && !falhouCadastro && (
          <p className="text-xs text-ink-400">
            Nenhuma conta ativa no cadastro do órgão. Cadastre-as em{' '}
            <Link
              to="/execucao/financeiro/contas-bancarias"
              className="inline-flex items-center gap-1 text-brand-600 hover:underline dark:text-brand-400"
            >
              Execução → Financeiro → Contas Bancárias
              <ExternalLink className="h-3 w-3" />
            </Link>
            .
          </p>
        )}

        {contas.length === 0 ? (
          <p className="text-xs text-ink-400">Nenhuma conta vinculada a este ajuste.</p>
        ) : (
          <div className="space-y-3">
            {contas.map((c, i) => {
              /* Uma conta escolhida noutra linha não deve reaparecer: a mesma
                 conta duas vezes no mesmo ajuste é ou engano, ou a tentativa de
                 dar duas fontes à mesma conta — e aí o pagamento não teria como
                 decidir qual delas usar. */
              const jaEscolhidas = contas
                .filter((_, j) => j !== i)
                .map((o) => o.contaBancariaId)
                .filter(Boolean);
              const opcoes = cadastro
                .filter((x) => !jaEscolhidas.includes(x.id))
                .map((x) => ({
                  value: x.id,
                  label: x.apelido || `${rotuloBanco(x.banco)} · ${x.conta}`,
                  sub: `${rotuloBanco(x.banco)} · Ag. ${x.agencia} · Conta ${x.conta}${
                    x.contaTipo ? ` (${rotuloDominio(CONTA_TIPO, x.contaTipo)})` : ''
                  }`,
                }));
              /* Conta vinculada antes de existir o cadastro, ou cuja linha de
                 cadastro foi inativada: o combo não a encontra. Ela continua
                 valendo — o ajuste declarou aqueles números —, e o aviso abaixo
                 mostra quais são, para a pessoa apontar a do cadastro quando
                 quiser. Sumir com ela seria apagar dado do ajuste em silêncio. */
              const semVinculo = !c.contaBancariaId && !!c.conta;
              const foraDoCadastro =
                !!c.contaBancariaId && !cadastro.some((x) => x.id === c.contaBancariaId);

              return (
                <div key={c.id ?? i} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-12">
                  <div className="sm:col-span-7">
                    <Combobox
                      label={i === 0 ? 'Conta do cadastro *' : ''}
                      name={`contaBancariaId-${i}`}
                      value={foraDoCadastro ? '' : (c.contaBancariaId ?? '')}
                      onChange={(v) => escolherDoCadastro(i, v)}
                      options={opcoes}
                      placeholder="Selecione a conta..."
                      hint={
                        semVinculo || foraDoCadastro
                          ? `Vinculada como ${descreverConta(c)} — escolha a correspondente do cadastro para atualizá-la.`
                          : undefined
                      }
                    />
                  </div>
                  {/* A fonte que entra nesta conta. As opções são **as fontes
                      declaradas acima**, não as 16 da tabela: a conta existe para
                      receber uma fonte que o ajuste prevê. */}
                  <div className="sm:col-span-4">
                    <SelectDominio
                      label={i === 0 ? 'Fonte de Recurso *' : ''}
                      name={`fonteRecursoTipo-${i}`}
                      value={c.fonteRecursoTipo != null ? String(c.fonteRecursoTipo) : ''}
                      onChange={(v) =>
                        alterarConta(i, { fonteRecursoTipo: v ? Number(apenasDigitos(v)) : null })
                      }
                      options={opcoesFonteDaConta}
                    />
                  </div>
                  <div className="flex justify-end pb-1 sm:col-span-1">
                    <IconBtn
                      title="Remover conta"
                      danger
                      onClick={() => onContas(contas.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconBtn>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
