import { app } from './app';

const PORT = Number(process.env.PORT ?? 3333);

app.listen(PORT, () => {
  console.log(`🚀 Solução TS — API rodando em http://localhost:${PORT}/api`);
});
