import { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SelectDominio } from '@/components/ui/SelectDominio';
import { Combobox, type OpcaoCombo } from '@/components/ui/Combobox';
import { enterComoTab } from '@/lib/enterComoTab';
import { CATEGORIA_DESPESA, ESTADO_EMISSOR } from '@/lib/dominiosFaseV';
import { apenasDigitos, mascaraCpfCnpj, mascaraMoeda, moedaParaNumero, numeroParaMascaraMoeda } from '@/lib/masks';
import { listarFornecedores } from '@/services/fornecedores.service';
import { listarRateios } from '@/services/rateios.service';
import { despesasApi } from '@/services/despesas.service';
import { extrairMensagemErro } from '@/services/http';
import { vigentesEm } from '@/types/rateio';
import type { Fornecedor } from '@/types/fornecedor';
import type { Rateio } from '@/types/rateio';
import {
  TIPO_DOCUMENTO_FISCAL_LABEL,
  TIPO_RETENCAO_LABEL,
  type DocumentoFiscal,
  type DocumentoFiscalPayload,
  type TipoDocumentoFiscal,
  type TipoRetencao,
} from '@/types/prestacaoBlocos';

/** O credor já gravado que não está entre os fornecedores ativos. */
const PRESERVADO = '__gravado__';

/**
 * Lançamento da despesa no escopo do órgão.
 *
 * É o formulário da aba da prestação **menos** o que só existe lá: a rubrica do
 * Plano de Aplicação, o contrato da prestação e o percentual do rateio. Os três
 * dependem do ajuste, e aqui ainda não se sabe qual — a nota pode acabar em
 * cinco prestações diferentes. O que se guarda aqui é o **método** de rateio;
 * o percentual é calculado quando uma prestação se apropria da nota.
 */
export function DespesaForm({
  item,
  onSuccess,
  onCancel,
}: {
  item: DocumentoFiscal | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [numero, setNumero] = useState(item?.numero ?? '');
  const [tipoDoc, setTipoDoc] = useState<TipoDocumentoFiscal | ''>(item?.tipoDocumento ?? '');
  const [descricao, setDescricao] = useState(item?.descricao ?? '');
  const [dataEmissao, setDataEmissao] = useState(item?.dataEmissao ?? '');
  const [estadoEmissor, setEstadoEmissor] = useState(
    item?.estadoEmissor != null ? String(item.estadoEmissor) : '',
  );
  const [bruto, setBruto] = useState(item ? numeroParaMascaraMoeda(item.valorBruto) : '');
  const [retencao, setRetencao] = useState(item ? numeroParaMascaraMoeda(item.valorEncargos) : '');
  const [retencaoTipo, setRetencaoTipo] = useState<TipoRetencao | ''>(item?.retencaoTipo ?? '');
  const [categoria, setCategoria] = useState(item ? String(item.categoriaDespesaTipo) : '');
  const [contratoNumero, setContratoNumero] = useState(item?.contratoNumero ?? '');

  const [credorId, setCredorId] = useState('');
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);

  const [rateioProveniente, setRateioProveniente] = useState(item?.rateioProveniente ?? false);
  const [rateioId, setRateioId] = useState(item?.rateioId ?? '');
  const [rateios, setRateios] = useState<Rateio[]>([]);

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let vivo = true;
    listarFornecedores({ filtros: { ativo: true }, page: 1, pageSize: 500, orderBy: 'nome', orderDir: 'asc' })
      .then((r) => vivo && setFornecedores(r.data))
      .catch(() => undefined);
    listarRateios({ page: 1, pageSize: 200, orderBy: 'vigenciaInicio', orderDir: 'desc' })
      .then((r) => vivo && setRateios(r.data))
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, []);

  // O credor gravado que não está entre os ativos vira opção própria: sem isso,
  // editar uma nota antiga abriria com o campo vazio, e salvar a apagaria.
  const credorForaDaLista = !!item && !fornecedores.some((f) => f.documento === item.credorNumeroDoc);

  useEffect(() => {
    if (!item) return;
    const achado = fornecedores.find((f) => f.documento === item.credorNumeroDoc);
    setCredorId(achado ? achado.id : PRESERVADO);
  }, [item, fornecedores]);

  const opcoesCredor: OpcaoCombo[] = [
    ...(credorForaDaLista && item
      ? [
          {
            value: PRESERVADO,
            label: item.credorNome || item.credorNumeroDoc,
            sub: `${item.credorTipoDoc} ${mascaraCpfCnpj(item.credorNumeroDoc)} · gravado nesta nota`,
          },
        ]
      : []),
    ...fornecedores.map((f) => ({
      value: f.id,
      label: f.nome,
      sub: `${f.documentoTipo} ${mascaraCpfCnpj(f.documento)}`,
    })),
  ];

  /*
   * Só os rateios vigentes na data de emissão.
   *
   * É para isso que o Período Adotado do cadastro existe: oferecer um método
   * que não valia na data levaria a nota a ser distribuída por uma regra que
   * não estava em vigor quando a despesa aconteceu.
   */
  const rateiosDisponiveis = dataEmissao ? vigentesEm(rateios, dataEmissao) : [];

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!numero.trim()) return setErro('Informe o número do documento.');
    if (!credorId) return setErro('Selecione o credor (Fornecedor / Prestador).');
    if (!descricao.trim()) return setErro('Informe a descrição.');
    if (!dataEmissao) return setErro('Informe a data de emissão.');

    const vBruto = moedaParaNumero(bruto);
    const vRet = retencao ? moedaParaNumero(retencao) : 0;
    if (vBruto <= 0) return setErro('Valor bruto inválido.');
    if (vRet >= vBruto) return setErro('A retenção deve ser menor que o valor bruto.');
    if (!categoria.trim()) return setErro('Informe a categoria de despesa AUDESP.');
    if (rateioProveniente && !rateioId) return setErro('Escolha o método de rateio.');

    // O credor é copiado do cadastro para a nota — fotografia, não vínculo: o
    // que o TCESP recebe precisa ser o credor na data da emissão.
    const escolhido = fornecedores.find((f) => f.id === credorId);
    if (!escolhido && credorId !== PRESERVADO)
      return setErro('Selecione o credor (Fornecedor / Prestador).');

    const payload: DocumentoFiscalPayload = {
      numero: numero.trim(),
      credorTipoDoc: escolhido ? escolhido.documentoTipo : item!.credorTipoDoc,
      credorNumeroDoc: escolhido ? escolhido.documento : item!.credorNumeroDoc,
      credorNome: escolhido ? escolhido.nome : item!.credorNome,
      contratoNumero: contratoNumero.trim() || null,
      descricao: descricao.trim(),
      dataEmissao,
      estadoEmissor: estadoEmissor ? Number(apenasDigitos(estadoEmissor)) : null,
      valorBruto: vBruto,
      valorEncargos: vRet,
      retencaoTipo: retencaoTipo || null,
      tipoDocumento: tipoDoc || null,
      categoriaDespesaTipo: Number(apenasDigitos(categoria)),
      rateioProveniente,
      rateioId: rateioProveniente ? rateioId : null,
    };

    setSalvando(true);
    try {
      if (item) await despesasApi.atualizar(item.id, payload);
      else await despesasApi.criar(payload);
      onSuccess();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível salvar a despesa.'));
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
        <div className="sm:col-span-4">
          <Select
            label="Tipo do Documento Fiscal"
            name="tipoDoc"
            value={tipoDoc}
            onChange={(e) => setTipoDoc(e.target.value as TipoDocumentoFiscal)}
            options={(Object.keys(TIPO_DOCUMENTO_FISCAL_LABEL) as TipoDocumentoFiscal[]).map((t) => ({
              value: t,
              label: TIPO_DOCUMENTO_FISCAL_LABEL[t],
            }))}
            placeholder="Selecione..."
          />
        </div>
        <div className="sm:col-span-3">
          <Input label="Nº do documento *" name="numero" value={numero} onChange={(e) => setNumero(e.target.value)} />
        </div>
        <div className="sm:col-span-3">
          <Input label="Data de emissão *" name="dataEmissao" type="date" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <SelectDominio label="UF emissor" name="estadoEmissor" value={apenasDigitos(estadoEmissor)} onChange={setEstadoEmissor} options={ESTADO_EMISSOR} />
        </div>

        <div className="sm:col-span-8">
          <Combobox
            label="Credor (Fornecedor / Prestador) *"
            name="credorId"
            value={credorId}
            onChange={setCredorId}
            options={opcoesCredor}
            placeholder={opcoesCredor.length ? 'Digite para localizar...' : 'Nenhum fornecedor ativo cadastrado'}
            disabled={!opcoesCredor.length}
            hint="Vem de Cadastro → Fornecedores / Prestadores."
          />
        </div>
        <div className="sm:col-span-4">
          <Input label="Nº do contrato (opcional)" name="contratoNumero" value={contratoNumero} onChange={(e) => setContratoNumero(e.target.value)} />
        </div>

        <div className="sm:col-span-12">
          <Input label="Descrição *" name="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>

        <div className="sm:col-span-4">
          <Input label="Valor bruto (R$) *" name="bruto" value={bruto} onChange={(e) => setBruto(mascaraMoeda(e.target.value))} placeholder="0,00" inputMode="numeric" />
        </div>
        <div className="sm:col-span-4">
          <Input label="Retenções (R$)" name="retencao" value={retencao} onChange={(e) => setRetencao(mascaraMoeda(e.target.value))} placeholder="0,00" inputMode="numeric" />
        </div>
        <div className="sm:col-span-4">
          <Select
            label="Tipo de retenção"
            name="retencaoTipo"
            value={retencaoTipo}
            onChange={(e) => setRetencaoTipo(e.target.value as TipoRetencao)}
            options={(Object.keys(TIPO_RETENCAO_LABEL) as TipoRetencao[]).map((t) => ({
              value: t,
              label: TIPO_RETENCAO_LABEL[t],
            }))}
            placeholder="—"
          />
        </div>

        <div className="sm:col-span-12">
          <SelectDominio label="Categoria de Despesa AUDESP *" name="categoria" value={apenasDigitos(categoria)} onChange={setCategoria} options={CATEGORIA_DESPESA} />
        </div>
      </div>

      {/* Rateio — o método, não o percentual. Ver o comentário do componente. */}
      <fieldset className="rounded-xl border border-ink-200 px-3 pb-3 pt-1 dark:border-ink-700">
        <legend className="px-1 text-[13px] font-normal text-ink-600 dark:text-ink-300">
          Rateio <span className="text-ink-400">— para despesa que se divide entre ajustes</span>
        </legend>
        <label className="flex items-center gap-2 py-2 text-sm text-ink-700 dark:text-ink-200">
          <input
            type="checkbox"
            checked={rateioProveniente}
            onChange={(e) => setRateioProveniente(e.target.checked)}
            className="h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-400 dark:border-ink-600 dark:bg-ink-800"
          />
          Proveniente de rateio
        </label>
        {rateioProveniente && (
          <div className="space-y-1">
            <Combobox
              label="Método de rateio *"
              name="rateioId"
              value={rateioId}
              onChange={setRateioId}
              options={rateiosDisponiveis.map((r) => ({ value: r.id, label: r.titulo }))}
              placeholder={
                !dataEmissao
                  ? 'Informe a data de emissão primeiro'
                  : rateiosDisponiveis.length
                    ? 'Selecione o método...'
                    : 'Nenhum rateio vigente na data de emissão'
              }
              disabled={!rateiosDisponiveis.length}
            />
            <p className="text-xs text-ink-400">
              Só aparecem os rateios <strong>vigentes na data de emissão</strong>. O percentual de
              cada ajuste é calculado na prestação de contas, não aqui.
            </p>
          </div>
        )}
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
