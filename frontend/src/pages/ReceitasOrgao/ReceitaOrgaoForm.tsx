import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { enterComoTab } from '@/lib/enterComoTab';
import { BANCO, FONTE_RECURSO } from '@/lib/dominiosFaseV';
import { mascaraMoeda, moedaParaNumero, numeroParaMascaraMoeda } from '@/lib/masks';
import { receitasOrgaoApi } from '@/services/receitasOrgao.service';
import { contasApi } from '@/services/contasBancarias.service';
import { useAjusteExecucao } from '@/contexts/AjusteExecucaoContext';
import { extrairMensagemErro } from '@/services/http';
import { rotuloConta, type ContaBancaria } from '@/types/contaBancaria';
import {
  RECEITA_TIPO_LABEL,
  ehAplicacaoFinanceira,
  type Receita,
  type ReceitaPayload,
  type ReceitaTipo,
} from '@/types/prestacaoBlocos2';

const rotuloBanco = (codigo: number) =>
  BANCO.find((b) => b.value === String(codigo))?.label ?? String(codigo);
const rotuloFonte = (codigo: number) =>
  FONTE_RECURSO.find((f) => f.value === String(codigo))?.label ?? String(codigo);

/**
 * Lançamento da receita no escopo do órgão.
 *
 * **Três campos viraram um.** O formulário perguntava a fonte de recurso e,
 * separadamente, banco, agência e conta. Mas o cadastro de Contas Bancárias já
 * sabe as quatro coisas — `ContaBancaria.fonteRecursoTipo` existe justamente
 * para dizer de qual fonte aquela conta recebe. Perguntar de novo era pedir ao
 * usuário que repetisse o que o sistema tinha, e abrir a chance de ele
 * responder diferente: fonte "municipal" numa conta que o cadastro diz ser
 * estadual, e nada acusaria.
 *
 * **E fecha um furo de rejeição.** `fonte_recurso_tipo` é **obrigatório** em
 * `repasses_recebidos` no schema v1.14, e o `limpo()` do montador remove nulos:
 * um repasse lançado sem fonte sumia do JSON e o documento voltava rejeitado,
 * sem nada avisar antes. Agora a fonte não depende de alguém lembrar de
 * preenchê-la.
 *
 * Quem grava os dados bancários é o servidor, copiando da conta — aqui eles não
 * são enviados. São **fotografia**: editar a conta amanhã não reescreve um
 * lançamento já feito.
 */
export function ReceitaOrgaoForm({
  item,
  onSuccess,
  onCancel,
}: {
  item: Receita | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [tipo, setTipo] = useState<ReceitaTipo>(item?.tipo ?? 'REPASSE_RECEBIDO');
  const [valor, setValor] = useState(item ? numeroParaMascaraMoeda(Math.abs(item.valor)) : '');
  const [negativo, setNegativo] = useState(item ? item.valor < 0 : false);
  const [dataRepasse, setDataRepasse] = useState(item?.dataRepasse ?? '');
  const [dataPrevista, setDataPrevista] = useState(item?.dataPrevista ?? '');
  const [descricao, setDescricao] = useState(item?.descricao ?? '');
  const [contaId, setContaId] = useState(item?.contaBancariaId ?? '');
  const [transacao, setTransacao] = useState(item?.numeroTransacao ?? '');
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [carregandoContas, setCarregandoContas] = useState(true);
  const { ajusteId } = useAjusteExecucao();
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let vivo = true;
    // Só as ativas: conta desativada não deve ser oferecida para lançamento
    // novo. A que já está no registro continua aparecendo — ver `opcoes`.
    contasApi
      .listar(true)
      .then((r) => vivo && setContas(r))
      .catch(() => vivo && setContas([]))
      .finally(() => vivo && setCarregandoContas(false));
    return () => {
      vivo = false;
    };
  }, []);

  const conta = contas.find((c) => c.id === contaId) ?? null;

  /*
   * A conta gravada continua na lista mesmo se for inativada depois.
   *
   * Sem isto, abrir um lançamento antigo mostraria o campo em branco e salvar
   * apagaria o vínculo — a tela desfazendo, em silêncio, o que ninguém pediu.
   */
  const opcoes = useMemo(() => {
    const lista = [...contas];
    if (item?.contaBancariaId && !lista.some((c) => c.id === item.contaBancariaId))
      lista.push({
        id: item.contaBancariaId,
        clienteId: null,
        banco: item.banco ?? 0,
        agencia: item.agencia != null ? String(item.agencia) : '',
        conta: item.contaCorrente ?? '',
        contaTipo: null,
        fonteRecursoTipo: item.fonteRecursoTipo,
        apelido: null,
        observacao: null,
        ativo: false,
      } as ContaBancaria);
    return lista.map((c) => ({ value: c.id, label: rotuloConta(c, rotuloBanco) }));
  }, [contas, item]);

  /** A fonte que será gravada: a da conta escolhida, ou a que o registro já tem. */
  const fonteEfetiva = conta?.fonteRecursoTipo ?? (contaId ? null : (item?.fonteRecursoTipo ?? null));
  const exigeFonte = tipo === 'REPASSE_RECEBIDO';

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const mag = moedaParaNumero(valor);
    if (mag <= 0) return setErro('Informe o valor.');
    if (exigeFonte && fonteEfetiva == null)
      return setErro(
        'Escolha a conta bancária do repasse — é dela que vem a fonte de recurso, obrigatória no envio ao TCESP.',
      );

    const payload: ReceitaPayload = {
      // A parceria vem do portão da Execução, não de um campo: lançar receita
      // sem dono foi o que permitiu o repasse de um ajuste entrar na prestação
      // de outro.
      ajusteId: ajusteId ?? null,
      tipo,
      descricao: descricao.trim() || null,
      dataPrevista: dataPrevista || null,
      dataRepasse: dataRepasse || null,
      contaBancariaId: contaId || null,
      valor: negativo ? -mag : mag,
      numeroTransacao: transacao.trim() || null,
      // Fonte, banco, agência e conta **não** são enviados: quem os deriva da
      // conta escolhida é o servidor. Mandá-los daqui permitiria gravar uma
      // fonte que a conta desmente.
    };

    setSalvando(true);
    try {
      if (item) await receitasOrgaoApi.atualizar(item.id, payload);
      else await receitasOrgaoApi.criar(payload);
      onSuccess();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível salvar a receita.'));
    } finally {
      setSalvando(false);
    }
  }

  const semContas = !carregandoContas && contas.length === 0;

  return (
    <form onSubmit={submeter} onKeyDown={enterComoTab} className="space-y-4">
      {erro && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      {/*
        Sem conta cadastrada não há de onde tirar a fonte, e o repasse não pode
        ser lançado. Dizer isso aqui, com o caminho, é melhor que deixar a
        pessoa descobrir no erro do servidor.
      */}
      {semContas && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Nenhuma conta bancária cadastrada. Cadastre em{' '}
            <Link to="/cadastro/financeiro/contas-bancarias" className="font-semibold underline">
              Cadastro → Financeiro → Contas Bancárias
            </Link>{' '}
            — é dela que vem a fonte de recurso do repasse.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label="Tipo *"
          name="tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as ReceitaTipo)}
          options={(Object.keys(RECEITA_TIPO_LABEL) as ReceitaTipo[]).map((t) => ({
            value: t,
            label: RECEITA_TIPO_LABEL[t],
          }))}
        />
        <Input label="Valor (R$) *" name="valor" value={valor} onChange={(e) => setValor(mascaraMoeda(e.target.value))} placeholder="0,00" inputMode="numeric" />
        <Input label="Data do recebimento" name="dataRepasse" type="date" value={dataRepasse} onChange={(e) => setDataRepasse(e.target.value)} />
        <Input label="Data prevista" name="dataPrevista" type="date" value={dataPrevista} onChange={(e) => setDataPrevista(e.target.value)} />

        {/*
          A conta bancária no lugar dos quatro campos que saíram.

          Ocupa a linha inteira porque é o campo que decide a fonte de recurso —
          e porque o rótulo da conta é longo (apelido + tipo, ou banco, agência
          e número).
        */}
        <div className="sm:col-span-2">
          <Select
            label={`Conta bancária${exigeFonte ? ' *' : ''}`}
            name="contaBancariaId"
            value={contaId}
            disabled={carregandoContas}
            onChange={(e) => setContaId(e.target.value)}
            placeholder={carregandoContas ? 'Carregando...' : 'Não informada'}
            options={opcoes}
          />
          {/*
            A fonte aparece, mas não se digita. Ela vai ao TCESP e o usuário
            precisa ver o que está sendo gravado — um campo que some sem deixar
            rastro faria a pessoa achar que o dado se perdeu.
          */}
          {fonteEfetiva != null ? (
            <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
              Fonte de recurso:{' '}
              <strong className="text-ink-700 dark:text-ink-200">{rotuloFonte(fonteEfetiva)}</strong>
              {!contaId && ' (do lançamento; escolha a conta para atualizá-la)'}
            </p>
          ) : (
            <p className="mt-1 text-xs text-ink-400">
              A fonte de recurso vem da conta escolhida.
              {conta && conta.fonteRecursoTipo == null && (
                <span className="text-amber-600 dark:text-amber-400">
                  {' '}
                  Esta conta está sem fonte no cadastro — informe-a antes de lançar.
                </span>
              )}
            </p>
          )}
        </div>

        <Input label="Nº da transação (opcional)" name="transacao" value={transacao} onChange={(e) => setTransacao(e.target.value)} />
        <div className="sm:col-span-2">
          <Input label="Descrição" name="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>
        {ehAplicacaoFinanceira(tipo) && (
          <label className="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-200">
            <input
              type="checkbox"
              checked={negativo}
              onChange={(e) => setNegativo(e.target.checked)}
              className="h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-400 dark:border-ink-600 dark:bg-ink-800"
            />
            Valor negativo (resgate/perda)
          </label>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={salvando}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvando}>
          {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
          {salvando ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}
