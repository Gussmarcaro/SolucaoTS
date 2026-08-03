import { app } from './app';
import { backfillBusca } from './infrastructure/database/backfillBusca';

const PORT = Number(process.env.PORT ?? 3333);

app.listen(PORT, () => {
  console.log(`🚀 Solução TS — API rodando em http://localhost:${PORT}/api`);
  // Preenche o campo de busca de registros antigos (não bloqueia o start).
  void backfillBusca();
});
