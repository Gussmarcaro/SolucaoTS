import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SelectDominio } from '@/components/ui/SelectDominio';
import { enterComoTab } from '@/lib/enterComoTab';
import { BANCO, FONTE_RECURSO } from '@/lib/dominiosFaseV';
import { apenasDigitos, mascaraMoeda, moedaParaNumero, numeroParaMascaraMoeda } from '@/lib/masks';
import { receitasOrgaoApi } from '@/services/receitasOrgao.service';
import { extrairMensagemErro } from '@/services/http';
import {
  RECEITA_TIPO_LABEL,
  ehAplicacaoFinanceira,
  type Receita,
  type ReceitaPayload,
  type ReceitaTipo,
} from '@/types/prestacaoBlocos2';

/**
 * Lançamento da receita no escopo do órgão.
 *
 * Sem a "Conta do ajuste" que a aba da prestação oferece: aquele campo lê as
 * contas declaradas no ajuste, e aqui ainda não se sabe qual ajuste — a receita
 * é apropriada por uma prestação depois. Banco, agência e conta continuam
 * digitáveis, como controle interno que são: o bloco `receitas` do schema
 * oficial é um objeto de totais e não os transmite.
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
  const [fonte, setFonte] = useState(item?.fonteRecursoTipo != null ? String(item.fonteRecursoTipo) : '');
  const [descricao, setDescricao] = useState(item?.descricao ?? '');
  const [banco, setBanco] = useState(item?.banco != null ? String(item.banco) : '');
  const [agencia, setAgencia] = useState(item?.agencia != null ? String(item.agencia) : '');
  const [conta, setConta] = useState(item?.contaCorrente ?? '');
  const [transacao, setTransacao] = useState(item?.numeroTransacao ?? '');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const mag = moedaParaNumero(valor);
    if (mag <= 0) return setErro('Informe o valor.');

    const payload: ReceitaPayload = {
      tipo,
      descricao: descricao.trim() || null,
      dataPrevista: dataPrevista || null,
      dataRepasse: dataRepasse || null,
      fonteRecursoTipo: fonte ? Number(apenasDigitos(fonte)) : null,
      valor: negativo ? -mag : mag,
      banco: banco ? Number(apenasDigitos(banco)) : null,
      agencia: agencia ? Number(apenasDigitos(agencia)) : null,
      contaCorrente: conta.trim() || null,
      numeroTransacao: transacao.trim() || null,
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

  return (
    <form onSubmit={submeter} onKeyDown={enterComoTab} className="space-y-4">
      {erro && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{erro}</span>
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
        <SelectDominio label="Fonte de Recurso" name="fonte" value={apenasDigitos(fonte)} onChange={setFonte} options={FONTE_RECURSO} />
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

      <fieldset className="rounded-xl border border-ink-200 px-3 pb-3 pt-1 dark:border-ink-700">
        <legend className="px-1 text-[13px] font-normal text-ink-600 dark:text-ink-300">
          Identificação bancária <span className="text-ink-400">— controle interno, não enviada ao TCESP</span>
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SelectDominio label="Banco" name="banco" value={apenasDigitos(banco)} onChange={setBanco} options={BANCO} />
          <Input label="Agência" name="agencia" value={apenasDigitos(agencia)} onChange={(e) => setAgencia(e.target.value)} inputMode="numeric" />
          <Input label="Conta Corrente" name="conta" value={conta} onChange={(e) => setConta(e.target.value)} />
        </div>
      </fieldset>

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
