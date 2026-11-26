import { useState } from 'react';
import { AlertCircle, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { FormularioNovo } from '@/components/ui/LabelCampo';
import { UF_OPTIONS } from '@/lib/ufs';
import {
  apenasDigitos,
  mascaraCelular,
  mascaraCep,
  mascaraCpfCnpj,
  mascaraInscricao,
  mascaraTelefoneFixo,
  tipoDocumento,
} from '@/lib/masks';
import { isDocumentoValido, isEmailValido } from '@/lib/validators';
import { capitalizarNome } from '@/lib/nomeProprio';
import { consultarCep } from '@/services/viacep.service';
import {
  atualizarFornecedor,
  criarFornecedor,
  levarNomeAsCopias,
  nomeNasCopias,
  type NomeNasCopias,
} from '@/services/fornecedores.service';
import { extrairCodigoErro, extrairMensagemErro } from '@/services/http';
import type { Fornecedor, FornecedorPayload } from '@/types/fornecedor';

interface Props {
  fornecedor?: Fornecedor | null;
  /**
   * Avisa que gravou — e **devolve o que foi criado**.
   *
   * O argumento existe para quem abre este formulário de dentro de outra
   * tela: o lançamento da despesa precisa selecionar o fornecedor que acabou
   * de nascer, e recarregar a lista para procurá-lo pelo nome acharia o
   * homônimo errado. Quem só fecha a tela ignora o argumento.
   */
  onSuccess: (criado?: Fornecedor) => void;
  onCancel: () => void;
}

type Campos = {
  nome: string;
  documento: string;
  inscricaoEstadual: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  email: string;
  telefoneFixo: string;
  whatsapp: string;
};

function estadoInicial(f?: Fornecedor | null): Campos {
  return {
    nome: f?.nome ?? '',
    documento: f?.documento ?? '',
    inscricaoEstadual: f?.inscricaoEstadual ?? '',
    cep: f?.cep ?? '',
    logradouro: f?.logradouro ?? '',
    numero: f?.numero ?? '',
    complemento: f?.complemento ?? '',
    bairro: f?.bairro ?? '',
    cidade: f?.cidade ?? '',
    uf: f?.uf ?? '',
    email: f?.email ?? '',
    telefoneFixo: f?.telefoneFixo ?? '',
    whatsapp: f?.whatsapp ?? '',
  };
}

export function FornecedorForm({ fornecedor, onSuccess, onCancel }: Props) {
  const editando = !!fornecedor;
  const [form, setForm] = useState<Campos>(() => estadoInicial(fornecedor));
  const [erros, setErros] = useState<Partial<Record<keyof Campos, string>>>({});
  const [alerta, setAlerta] = useState<string | null>(null);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [salvando, setSalvando] = useState(false);
  /**
   * O nome mudou e há notas ou contratos com o nome antigo que ainda não foram
   * ao TCESP: o formulário dá lugar à pergunta, antes de fechar.
   */
  const [copias, setCopias] = useState<NomeNasCopias | null>(null);
  const [levando, setLevando] = useState(false);

  const set = (campo: keyof Campos, valor: string) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setErros((prev) => ({ ...prev, [campo]: undefined }));
    setAlerta(null);
  };

  async function handleCepBlur() {
    if (apenasDigitos(form.cep).length !== 8) return;
    setBuscandoCep(true);
    try {
      const endereco = await consultarCep(form.cep);
      if (!endereco) {
        setErros((prev) => ({ ...prev, cep: 'CEP não encontrado.' }));
        return;
      }
      setForm((prev) => ({
        ...prev,
        logradouro: endereco.logradouro || prev.logradouro,
        bairro: endereco.bairro || prev.bairro,
        cidade: endereco.cidade || prev.cidade,
        uf: endereco.uf || prev.uf,
      }));
    } catch {
      setErros((prev) => ({ ...prev, cep: 'Falha ao consultar o CEP.' }));
    } finally {
      setBuscandoCep(false);
    }
  }

  function validar(): boolean {
    const novos: Partial<Record<keyof Campos, string>> = {};
    if (form.nome.trim().length < 2) novos.nome = 'Informe o nome / razão social.';
    if (!isDocumentoValido(form.documento)) novos.documento = 'CPF/CNPJ inválido.';
    if (apenasDigitos(form.cep).length !== 8) novos.cep = 'CEP inválido.';
    if (!form.logradouro.trim()) novos.logradouro = 'Informe o endereço.';
    if (!form.bairro.trim()) novos.bairro = 'Informe o bairro.';
    if (!form.cidade.trim()) novos.cidade = 'Informe a cidade.';
    if (!form.uf) novos.uf = 'UF.';
    if (!isEmailValido(form.email)) novos.email = 'E-mail inválido.';
    setErros(novos);
    return Object.keys(novos).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAlerta(null);
    if (!validar()) return;

    const payload: FornecedorPayload = {
      nome: form.nome.trim(),
      documento: apenasDigitos(form.documento),
      documentoTipo: tipoDocumento(form.documento),
      inscricaoEstadual: form.inscricaoEstadual.trim() || null,
      cep: apenasDigitos(form.cep),
      logradouro: form.logradouro.trim(),
      numero: form.numero.trim() || null,
      complemento: form.complemento.trim() || null,
      bairro: form.bairro.trim(),
      cidade: form.cidade.trim(),
      uf: form.uf,
      email: form.email.trim().toLowerCase(),
      telefoneFixo: form.telefoneFixo ? apenasDigitos(form.telefoneFixo) : null,
      whatsapp: form.whatsapp ? apenasDigitos(form.whatsapp) : null,
    };

    setSalvando(true);
    try {
      if (editando) {
        await atualizarFornecedor(fornecedor!.id, payload);
        /*
         * O nome é copiado para a nota e o contrato no lançamento, e o cadastro
         * não os alcança sozinho. Se ele mudou, pergunta-se — e só então: o
         * levantamento não pode atrasar o salvar de quem trocou um telefone.
         */
        if (payload.nome !== fornecedor!.nome) {
          const l = await nomeNasCopias(fornecedor!.id).catch(() => null);
          if (l && l.notas.atualizaveis + l.contratosPrestacao.atualizaveis + l.contratosCadastro > 0) {
            setCopias(l);
            return;
          }
        }
        onSuccess();
      } else {
        onSuccess(await criarFornecedor(payload));
      }
    } catch (error) {
      const codigo = extrairCodigoErro(error);
      const msg = extrairMensagemErro(error, 'Não foi possível salvar o fornecedor.');
      if (codigo === 'DOCUMENTO_DUPLICADO') setErros((prev) => ({ ...prev, documento: msg }));
      setAlerta(msg);
    } finally {
      setSalvando(false);
    }
  }

  async function levarNome() {
    setLevando(true);
    setAlerta(null);
    try {
      await levarNomeAsCopias(fornecedor!.id);
      onSuccess();
    } catch (error) {
      setAlerta(extrairMensagemErro(error, 'O fornecedor foi salvo, mas não foi possível atualizar as notas.'));
    } finally {
      setLevando(false);
    }
  }

  if (copias) {
    const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
    const itens = [
      copias.notas.atualizaveis && plural(copias.notas.atualizaveis, 'nota fiscal', 'notas fiscais'),
      copias.contratosPrestacao.atualizaveis &&
        plural(copias.contratosPrestacao.atualizaveis, 'contrato de prestação', 'contratos de prestação'),
      copias.contratosCadastro && plural(copias.contratosCadastro, 'contrato do cadastro', 'contratos do cadastro'),
    ].filter(Boolean);
    const travadas = copias.notas.travadas + copias.contratosPrestacao.travados;
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          Fornecedor salvo.
        </div>
        <p className="text-sm text-ink-700 dark:text-ink-200">
          Há {itens.join(', ')} com outro nome para este CPF/CNPJ, em prestações que ainda não foram
          enviadas ao TCESP. Atualizar para <strong>{copias.nome}</strong>?
        </p>
        {travadas > 0 && (
          <p className="text-xs text-ink-500 dark:text-ink-400">
            {plural(travadas, 'lançamento fica', 'lançamentos ficam')} como está: pertence a prestação já
            transmitida, e tem de continuar dizendo o que foi enviado.
          </p>
        )}
        <p className="text-xs text-ink-500 dark:text-ink-400">
          Se o nome antigo é o que está impresso na nota (a razão social de MEI traz o CNPJ na frente),
          pode mantê-lo — o TCESP identifica o credor pelo CPF/CNPJ.
        </p>
        {alerta && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{alerta}</span>
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onSuccess()} disabled={levando}>
            Manter o nome antigo
          </Button>
          <Button type="button" onClick={levarNome} disabled={levando}>
            {levando && <Loader2 className="h-4 w-4 animate-spin" />}
            Atualizar também
          </Button>
        </div>
      </div>
    );
  }

  return (
    <FormularioNovo novo={!editando}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {alerta && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{alerta}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input label="Nome / Razão Social *" name="nome" value={form.nome} onChange={(e) => set('nome', capitalizarNome(e.target.value))} error={erros.nome} />
          </div>
          <Input
            label="CPF / CNPJ *"
            name="documento"
            value={mascaraCpfCnpj(form.documento)}
            onChange={(e) => set('documento', e.target.value)}
            error={erros.documento}
            placeholder="000.000.000-00"
            inputMode="numeric"
          />
          <Input label="Inscrição Estadual" name="inscricaoEstadual" value={mascaraInscricao(form.inscricaoEstadual)} onChange={(e) => set('inscricaoEstadual', e.target.value)} placeholder="Isento ou nº" />

          <Input
            label="CEP *"
            name="cep"
            value={mascaraCep(form.cep)}
            onChange={(e) => set('cep', e.target.value)}
            onBlur={handleCepBlur}
            error={erros.cep}
            placeholder="00000-000"
            inputMode="numeric"
            rightSlot={buscandoCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          />
          <div className="grid grid-cols-1 gap-4 sm:col-span-1 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Input label="Endereço *" name="logradouro" value={form.logradouro} onChange={(e) => set('logradouro', e.target.value)} error={erros.logradouro} />
            </div>
            <Input label="Número" name="numero" value={form.numero} onChange={(e) => set('numero', e.target.value)} />
          </div>

          <Input label="Complemento" name="complemento" value={form.complemento} onChange={(e) => set('complemento', e.target.value)} />
          <Input label="Bairro *" name="bairro" value={form.bairro} onChange={(e) => set('bairro', e.target.value)} error={erros.bairro} />
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Input label="Cidade *" name="cidade" value={form.cidade} onChange={(e) => set('cidade', e.target.value)} error={erros.cidade} />
            </div>
            <Select label="UF *" name="uf" value={form.uf} onChange={(e) => set('uf', e.target.value)} error={erros.uf} options={UF_OPTIONS} placeholder="—" />
          </div>

          <Input label="E-mail *" name="email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} error={erros.email} />
          <Input label="Telefone Fixo" name="telefoneFixo" value={mascaraTelefoneFixo(form.telefoneFixo)} onChange={(e) => set('telefoneFixo', e.target.value)} placeholder="(00) 0000-0000" inputMode="numeric" />
          <Input label="Celular / WhatsApp" name="whatsapp" value={mascaraCelular(form.whatsapp)} onChange={(e) => set('whatsapp', e.target.value)} placeholder="(00) 00000-0000" inputMode="numeric" />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando}>
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
            {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}
          </Button>
        </div>
      </form>
    </FormularioNovo>
  );
}
