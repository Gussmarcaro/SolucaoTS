# Mapa de navegação do sistema Solução TS

> Extraído automaticamente do menu do sistema (`navigation.ts`) em 2026-08-13.
> Estes são os caminhos que existem de fato. Nenhum outro caminho deve ser afirmado.

## Menu principal

- **Dashboard** — rota `/`
- **Cadastro → Entidades / Beneficiárias** — rota `/cadastro/entidades`
- **Cadastro → Ajustes Celebrados** — rota `/cadastro/ajustes`
- **Cadastro → Fornecedores / Prestadores** — rota `/cadastro/fornecedores`
- **Cadastro → Contratos Firmados** — rota `/cadastro/contratos`
- **Cadastro → Colaboradores** — rota `/cadastro/colaboradores`
- **Cadastro → Bens Cedidos** — rota `/cadastro/bens-cedidos`
- **Cadastro → Servidores Cedidos** — rota `/cadastro/servidores-cedidos`
- **Execução → Financeiro → Contas Bancárias** — rota `/execucao/financeiro/contas-bancarias`
- **Execução → Financeiro → Receitas** — rota `/execucao/financeiro/receitas`
- **Execução → Financeiro → Despesas** — rota `/execucao/financeiro/despesas`
- **Execução → Financeiro → Pagamentos** — rota `/execucao/financeiro/pagamentos`
- **Execução → Financeiro → Rateio Administrativo – Custos Indiretos** — rota `/execucao/financeiro/rateio`
- **Execução → Financeiro → Conciliação Bancária** — rota `/execucao/financeiro/conciliacao`
- **Execução → Técnico** — rota `/execucao/tecnico`
- **Prestação de Contas** — rota `/prestacao-contas`
- **Relatórios** — rota `/relatorios`
- **Fiscalização | Monitoramento** — rota `/fiscalizacao`
- **Transparência** — rota `/transparencia`
- **Configurações → Órgãos Concessores** — rota `/orgaos`
- **Configurações → Usuários** — rota `/usuarios`
- **Configurações → Grupos de Usuários** — rota `/grupos`
- **Configurações → Auditoria** — rota `/auditoria` _(restrito aos grupos: Administrador, Suporte)_
- **Configurações → Privacidade e LGPD** — rota `/privacidade`

## Observações de acesso

- Itens marcados como restritos só aparecem para os grupos indicados; o servidor também barra a rota.
- O cadastro de **Empresas** está suspenso: saiu do menu, embora a rota `/empresas` continue registrada.
- Dentro de **Cadastro → Ajustes Celebrados**, cada ajuste abre um dossiê com abas próprias
  (Termos Aditivos, Certidões, Plano de Aplicação, Cronograma de Desembolso, Bens Cedidos,
  Programas e Metas, Empenhos).
- Dentro de **Cadastro → Entidades / Beneficiárias**, cada entidade abre abas: Geral, Diretoria,
  Conselhos, Regularidade Fiscal / Cadastral, Qualificações e Regulamentos.
- **Prestação de Contas** abre a lista de prestações; cada prestação tem os blocos exigidos pelo
  manual da Fase V em abas.
