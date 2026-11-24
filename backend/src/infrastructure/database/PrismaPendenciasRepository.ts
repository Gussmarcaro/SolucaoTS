import { prisma } from './prisma';
import type {
  ChavePendencia,
  IPendenciasRepository,
  Pendencia,
} from '@/application/dashboard/IPendenciasRepository';

/**
 * Como contar cada pendência — os mesmos critérios das telas para onde o
 * atalho leva, para o número do botão bater com o que a pessoa encontra lá.
 *
 * - Extrato: `conciliadoEm` vazio e **não ignorado**. A linha ignorada (tarifa,
 *   rendimento, transferência entre contas próprias) foi decidida, não
 *   esquecida — contá-la faria o atalho cobrar o que já se resolveu.
 * - Nota: nenhum anexo de tipo nenhum. Basta um arquivo para não contar, como
 *   na conferência da prestação.
 * - Pagamento: sem o anexo `COMPROVANTE_PAGAMENTO` especificamente.
 * - Prestação: `EM_ELABORACAO`. A rejeitada fica com o sino, que já a anuncia.
 *
 * O recorte por órgão vem da extension de tenant: os quatro models são raízes
 * (ou estão no `OR` de migração), e nenhum `clienteId` é escrito à mão.
 */
const COMO_CONTAR: Record<ChavePendencia, () => Promise<number>> = {
  extratoSemConciliar: () =>
    prisma.lancamentoExtrato.count({ where: { conciliadoEm: null, ignorado: false } }),
  notasSemArquivo: () => prisma.documentoFiscal.count({ where: { anexos: { none: {} } } }),
  pagamentosSemComprovante: () =>
    prisma.pagamento.count({ where: { anexos: { none: { tipo: 'COMPROVANTE_PAGAMENTO' } } } }),
  prestacoesEmElaboracao: () => prisma.prestacaoContas.count({ where: { status: 'EM_ELABORACAO' } }),
};

export class PrismaPendenciasRepository implements IPendenciasRepository {
  contar(chaves: ChavePendencia[]): Promise<Pendencia[]> {
    return Promise.all(chaves.map(async (chave) => ({ chave, total: await COMO_CONTAR[chave]() })));
  }
}
