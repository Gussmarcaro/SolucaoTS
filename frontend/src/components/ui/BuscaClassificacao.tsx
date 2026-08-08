import { useCallback } from 'react';
import { BuscaDominio, type ItemDominio } from './BuscaDominio';
import { dominiosApi, type ClassificacaoEconomicaItem } from '@/services/dominios.service';

/**
 * 'E' = obrigatório na execução da despesa (é o caso do empenho);
 * 'O' = só aceita lançamento no orçamento. Sinalizamos para o usuário não
 * escolher um código de nível agregado sem perceber.
 */
function detalhe(c: ClassificacaoEconomicaItem): string | undefined {
  return c.escrituracao?.trim().toUpperCase() === 'O' ? '· só orçamento' : undefined;
}

const paraItem = (c: ClassificacaoEconomicaItem): ItemDominio => ({
  codigo: c.codigo,
  descricao: c.nome,
  detalhe: detalhe(c),
});

interface Props {
  label?: string;
  value: string;
  onChange: (codigo: string) => void;
  /** Exercício do empenho; sem ele a API usa a edição mais recente carregada. */
  exercicio?: number;
  /** Esfera do ente: E=Estado, M=Municípios, C=Consórcios. */
  ente?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  name?: string;
}

/**
 * Seleção da classificação econômica da despesa (campo
 * `classificacao_economica_tipo` dos Empenhos). O código tem 8 dígitos —
 * categoria + grupo + modalidade + elemento + subelemento — e sua validade é
 * por exercício e por esfera do ente (§17 #2).
 */
export function BuscaClassificacao({
  label = 'Classificação Econômica',
  exercicio,
  ente,
  ...props
}: Props) {
  const buscar = useCallback(
    async (termo: string) => (await dominiosApi.buscarClassificacoes(termo, { exercicio, ente })).map(paraItem),
    [exercicio, ente],
  );

  const resolver = useCallback(
    async (codigo: string) => {
      const c = await dominiosApi.obterClassificacao(codigo, exercicio);
      return c ? paraItem(c) : null;
    },
    [exercicio],
  );

  return (
    <BuscaDominio
      label={label}
      buscar={buscar}
      resolver={resolver}
      placeholder="Código ou descrição (ex.: 33903900 ou serviços)"
      {...props}
    />
  );
}
