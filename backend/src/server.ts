import { iniciarMonitoramento } from './shared/monitoramento';
import { app } from './app';
import { backfillBusca } from './infrastructure/database/backfillBusca';
import { seedDominiosSeVazio } from './infrastructure/database/seedDominios';
import { registrar } from './shared/log';

/*
 * O monitoramento é iniciado aqui, no primeiro comando do processo — e não
 * antes dos imports, como a documentação do SDK costuma pedir. Aquela ordem
 * existe para a instrumentação automática conseguir envolver bibliotecas no
 * momento em que são carregadas; aqui ela não faz falta, porque nada é
 * capturado automaticamente: o `errorHandler` reporta explicitamente, e o
 * traço de transação está desligado.
 *
 * (Imports de ESM são içados, então uma chamada escrita "entre" eles rodaria
 * depois de todos de qualquer forma — a ordem aparente enganaria quem lesse.)
 */
iniciarMonitoramento();

const PORT = Number(process.env.PORT ?? 3333);

app.listen(PORT, () => {
  registrar('info', 'api-no-ar', { porta: PORT });
  // Preenche o campo de busca de registros antigos (não bloqueia o start).
  void backfillBusca();
  // Carrega as tabelas de domínio oficiais se ainda não estiverem no banco.
  void seedDominiosSeVazio();
});

/*
 * Uma falha não capturada derruba o processo. Registrar antes de morrer é a
 * diferença entre "a API reiniciou sozinha às 3h" e saber por quê — a
 * hospedagem sobe o serviço de novo e, sem isto, não sobra rastro nenhum.
 */
process.on('uncaughtException', (erro) => {
  registrar('erro', 'excecao-nao-capturada', { erro: erro.message, stack: erro.stack });
  throw erro;
});

process.on('unhandledRejection', (motivo) => {
  registrar('erro', 'promessa-rejeitada', {
    erro: motivo instanceof Error ? motivo.message : String(motivo),
  });
});
