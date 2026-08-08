import { BuscaDominio, type ItemDominio } from './BuscaDominio';
import { dominiosApi } from '@/services/dominios.service';

// Definidos fora do componente: o BuscaDominio reage à identidade de
// `resolver`, então recriá-las a cada render causaria busca em laço.
const buscar = async (termo: string): Promise<ItemDominio[]> =>
  (await dominiosApi.buscarCbos(termo)).map((c) => ({
    codigo: c.codigo,
    descricao: c.titulo,
    detalhe: c.medico ? '· médico' : undefined,
  }));

const resolver = async (codigo: string): Promise<ItemDominio | null> => {
  const c = await dominiosApi.obterCbo(codigo);
  return c ? { codigo: c.codigo, descricao: c.titulo } : null;
};

interface Props {
  label?: string;
  value: string;
  onChange: (codigo: string) => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
  name?: string;
}

/**
 * Seleção da ocupação no CBO 2002 (campo `cbo` da Relação de Empregados).
 * O código gravado sempre existe na tabela oficial — o TCESP rejeita a
 * prestação quando o CBO informado não é uma ocupação válida (§5 #5).
 */
export function BuscaCbo({ label = 'CBO', ...props }: Props) {
  return (
    <BuscaDominio
      label={label}
      buscar={buscar}
      resolver={resolver}
      placeholder="Código ou ocupação (ex.: 2251 ou médico)"
      {...props}
    />
  );
}
