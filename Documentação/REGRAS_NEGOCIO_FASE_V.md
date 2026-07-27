# Regras de Negócio — Audesp Fase V (Repasses ao Terceiro Setor / TCESP)

> Síntese extraída dos manuais oficiais do TCESP para embasar as validações da **Solução TS**.
> Fontes: Manual da Prestação de Contas v1.18 (JSON Schema v1.14), Manual Ajustes 2024, Manual Alteração/Exclusão, Manual Declaração Negativa, Manual Converter Excel→CSV, Fase_V_entidades.
> Data da síntese: 24/07/2026.

---

## 1. Visão geral do fluxo

A Fase V tem **dois módulos distintos**, nesta ordem:

1. **Módulo Ajustes (Cadastro)** — interface web interativa no portal Audesp. Cadastra-se o **Ajuste** (o contrato/parceria) e seus **Termos Aditivos**, incluindo Plano de Trabalho, Metas, Plano de Aplicação, Cronograma de Desembolso e Empenhos. Antes do ajuste, cadastram-se **Certidões** (responsáveis e beneficiária).
2. **Módulo Prestação de Contas** — **NÃO tem interface web**. É feito **exclusivamente via API REST** (WebService Audesp), enviando um **documento JSON** que referencia um ajuste já cadastrado.

> **Implicação para a Solução TS:** o sistema atua como *ferramenta do jurisdicionado* que (a) organiza os dados do ajuste e (b) **monta e transmite o JSON da prestação de contas** para a API do TCESP. O "empenho JSON" do DOCX é só **um dos ~30 blocos** da prestação.

## 2. Responsável pela prestação

- **Órgão Concessor** jurisdicionado ao TCESP (nos municípios, o órgão que assinou o ajuste).
- Permissão necessária: Sistema **"Audesp Fase V - Terceiro Setor"**, Papel **"Prestação de dados - jurisdicionado"** (concedida pelo Gestor de acessos do órgão).

## 3. Tipos de Ajuste e rotas da API de envio

| Tipo de Ajuste | Rota (path) de envio |
|---|---|
| Contrato de Gestão | `/f5/enviar-prestacao-contas-contrato-gestao` |
| Convênio | `/f5/enviar-prestacao-contas-convenio` |
| Termo de Colaboração | `/f5/enviar-prestacao-contas-termo-colaboracao` |
| Termo de Fomento | `/f5/enviar-prestacao-contas-termo_fomento` |
| Termo de Parceria | `/f5/enviar-prestacao-contas-termo-parceria` |
| Declaração Negativa | `/f5/declaracao-negativa` |

Vários blocos **variam conforme o tipo** (ex.: Regulamento de Compras só p/ Contrato de Gestão; Extrato Físico-Financeiro só p/ Termo de Parceria; Servidores Cedidos não se aplica a Colaboração/Fomento — ver §7).

## 4. Ambientes e Integração (API RESTful)

- **Produção:** `https://audesp.tce.sp.gov.br` · **Piloto:** `https://audesp-piloto.tce.sp.gov.br` (piloto inicia em 2024; produção em 2025). Os ambientes **não se comunicam**.
- Permissão de envio: **"Transmissão Pacotes - Fase V"** no sistema "WebService Audesp".

**Fluxo de chamadas:**
1. **Autenticação:** `POST /login` com header `x-authorization: <USUARIO>:<SENHA>` → retorna **token**.
2. **Envio:** `POST` na rota do tipo (multipart, campo `documentoJSON=@arquivo.json`), header `Authorization: Bearer <TOKEN>` → retorna **número de protocolo** (se passar no JSON Schema; senão erro da API).
3. **Consulta:** `GET /f5/consulta` com o protocolo → status.

**Estados do envio:** `Armazenado` (aceito) · `Rejeitado` (com lista de inconformidades → corrigir e reenviar) · `Substituído` (por retificação) · `Excluído`.

**Validação em 2 camadas:** (a) estrutura/formato → **JSON Schema** no momento do envio; (b) **regras de negócio** → após recepção pelo WebService.

## 5. Prazos legais (por periodicidade)

| Periodicidade | Quem | Prazo de envio |
|---|---|---|
| **Quadrimestral** | Prefeituras, Autarquias e Fundações Típicas (municipais); UGEs estaduais | **5 dias úteis** após o encerramento do quadrimestre |
| **Anual** | Demais órgãos (Câmaras, previdência, etc.) | **15 dias úteis** após o encerramento do ano |

A periodicidade de cada órgão está no arquivo **`Fase_V_entidades`** (seed). Base normativa: Comunicado AUDESP 53/2023 + calendário anual de obrigações.

> **Implicação:** o **Workflow** da Solução TS pode gerar automaticamente as tarefas/prazos a partir da periodicidade do Cliente.

## 6. Retificação e Declaração Negativa

**Retificação:** reenviar prestação **completa** com o flag de retificação → substitui integralmente a anterior (vira `Substituído`). Retificar exercício anterior obriga **reenviar todos os subsequentes** (viram `Excluído`). Dentro do prazo é automática; fora do prazo pode exigir autorização da Fiscalização.

**Declaração Negativa:** enviada quando **não há documentos no período**. É **por tipo de ajuste** — se o órgão assinou só Termo de Colaboração, envia negativa dos outros 4 tipos. Se cadastrar ajuste de todos os tipos no período, não precisa. Uma negativa é **sobrescrita automaticamente** por uma prestação do mesmo período (salvo se houver prestações de exercícios posteriores → exige retificação).

## 7. Blocos de dados da Prestação de Contas (documento JSON)

O JSON tem um **`descritor`** + os blocos abaixo. Campos monetários incrementam de R$ 0,01; datas no formato `YYYY-MM-DD`.

**Descritor:** `tipo_documento`, `municipio`, `entidade`, `ano` (≥ 2025 e ≤ ano corrente), `mes`. + `codigo_ajuste` (deve existir no módulo Ajustes, mesma entidade e mesmo tipo).

| # | Bloco | Aplicabilidade / regra-chave |
|---|---|---|
| 5 | **Relação de Empregados** | CPF único por (cpf+data_admissao); CBO válido; **CNS obrigatório p/ médicos (CBO subgrupo 225)**; períodos de remuneração dentro da vigência do vínculo |
| 6 | **Relação de Bens** (móveis/imóveis: adquiridos/cedidos/baixados) | datas dentro do período; **`valor_cessao` obrigatório** em bens móveis cedidos (reforçado v1.14) |
| 7 | **Contratos** | todos vigentes no período; único por (numero+data_assinatura+doc credor); CPF/CNPJ válido; **mín. de campos obrigatórios p/ Contrato de Gestão e Termo de Parceria** |
| 8 | **Documentos Fiscais** | qualquer comprovante (NF, recibo, fatura...); único por ajuste; `valor_encargos` ≥ 0 e < `valor_bruto`; data no período (1ª prestação pode ser anterior) |
| 9 | **Pagamentos** | vinculados a doc. fiscal; único por (doc+data+valor+fonte); **Folha Ordinária** usa nº doc `9999`; dados bancários só se meio = Banco |
| 10 | **Disponibilidades** | saldos bancário/contábil na **data final** do período; saldo fundo fixo |
| 11 | **Receitas** | repasses recebidos, aplicações financeiras (podem ser negativas), outras receitas, recursos próprios; chave inclui fonte de recurso |
| 12 | **Ajustes de Saldo** | retificação/inclusão de repasses e pagamentos de períodos anteriores (data anterior ao período) |
| 13 | **Servidores Cedidos** | **não se aplica a Colaboração/Fomento**; períodos de cessão; `onus_pagamento` |
| 14 | **Descontos** | dedução por descumprimento de metas; valor > 0 e < valor atualizado do ajuste |
| 15 | **Devoluções** | glosas/saldos devolvidos ou valor não aplicado; `natureza_devolucao_tipo` |
| 16 | **Glosas** | **todos** os documentos fiscais devem ter análise aqui (não só os glosados); `resultado_analise` (Aprovado/Parcial/Reprovado) |
| 17 | **Empenhos** | único por (numero+data_emissao); `classificacao_economica` válida p/ o exercício e esfera; data no período; CPF do ordenador válido |
| 18 | **Repasses** | vinculados a empenho; `data_repasse` ≥ emissão do empenho; soma dos repasses ≤ valor do empenho; justificativa se valor previsto ≠ repasse |
| 19 | **Relatório de Atividades** | programas→metas→periodicidades (1–15); `quantidade_realizada` (quantitativa) ou `resultado_meta` (qualitativa); metas devem existir no plano de trabalho do ajuste |
| 20 | **Dados Gerais da Entidade Beneficiária** | referencia **certidões** cadastradas no módulo Ajustes (tipo varia por tipo de ajuste) |
| 21 | **Responsáveis do Órgão Concessor** | certidões (responsáveis, comissão de avaliação, controle interno, fiscalização) |
| 22 | **Regulamento de Compras** | **só Contrato de Gestão** |
| 23 | **Extrato Execução Física/Financeira** | **só Termo de Parceria** |
| 24 | **Declarações** | contratação de empresas de dirigentes/parentes; adequação ao regulamento (só CG e TP) |
| 25 | **Relatório Comissão de Avaliação** | **só Contrato de Gestão**; justificativa se desfavorável |
| 26 | **Relatório Governamental Análise Execução** | **só Convênio** |
| 27 | **Relatório de Monitoramento e Avaliação** | **só Colaboração e Fomento** |
| 28 | **Demonstrações Contábeis** | — |
| 29-31 | **Publicações / Termo de Bens Cedidos** | veículos de publicação (tabela 1–10) |
| 32-33 | **Prestação de Contas da Entidade / Parecer Conclusivo** | parecer da autoridade (art. 203 IN 01/2024) |
| 34 | **Transparência** | — |
| 35-36 | **Retificação / Declaração Negativa** | ver §6 |

## 8. Módulo Cadastro de Ajuste (abas — interface web do TCESP)

Cadastro precedido de **Certidões** (Entidade Beneficiária + responsáveis). Abas do **Ajuste**: Dados Gerais · Identificação · Organização Social · Responsáveis pela Assinatura · Declarações · Cláusulas Contratuais · **Relação dos Bens Cedidos** · Convênios Relacionados · Entidade Gerenciada/Programa · Chamamento Público · Adequação Orçamentária · Convocação · Seleção · Publicação · **Plano de Trabalho** (Dados Gerais, **Plano de Metas**, **Plano de Aplicação**, **Cronograma de Desembolso**, **Empenho**). **Termo Aditivo** replica: Dados Gerais, Metas, Plano de Aplicação (Memória de Cálculo), Cronogramas, Empenho.

**Situações do Ajuste:** `Em elaboração` → (Concluir Ajuste) → `Enviado`.

## 9. Importação via CSV (Adicionar em lote)

Três abas aceitam importação CSV: **Relação de Bens Cedidos**, **Plano de Aplicação**, **Cronograma de Desembolso**.
- Formato: **CSV separado por vírgulas** gerado do Excel ("Salvar uma Cópia" → tipo CSV). Na prática os exemplos usam **`;`** e encoding **Latin-1**.
- Cuidado documentado: linhas apagadas no Excel podem ser reconhecidas como preenchidas → recomenda-se copiar dados para planilha nova antes de converter.
- **Solução TS:** os parsers devem normalizar encoding (Latin-1→UTF-8), mês por nome **ou** número, valores em padrão BR (`1.522.632,45`) e tratar duplicatas.

## 10. Validações transversais (aplicar no core da Solução TS)

- **CPF/CNPJ**: validação de dígito verificador (`documento_tipo` 1=CPF, 2=CNPJ, 3=RNE sem validação mas exige `nome`).
- **Unicidade por chave composta** em quase todos os blocos (ver tabela §7) — deduplicar/somar valores.
- **Datas** dentro do período da prestação (com exceções da 1ª prestação e de ajustes de saldo); assinaturas até 20 anos atrás; vigência até +10 anos.
- **Valores** monetários ≥ R$ 0,01; descontos/devoluções < valor atualizado do ajuste.
- **Campos condicionais** ("Outros" → exige descrição; meio Banco → exige dados bancários; conclusão desfavorável → exige justificativa).
- **Referências cruzadas**: contratos/documentos/empenhos citados devem existir na base (prestações anteriores) ou no próprio JSON.

## 11. Impacto no modelo de dados da Solução TS

O schema do DOCX (Convenio + Empenho simplificado) é **insuficiente**. O modelo real precisa cobrir:
- **Ajuste** (com `tipo_ajuste` enum de 5 valores) como entidade central, não só "Convenio".
- **Certidões**, **Plano de Trabalho/Metas**, **Plano de Aplicação**, **Cronograma de Desembolso**, **Termos Aditivos**.
- Todos os **blocos da prestação de contas** (§7) como entidades filhas de uma **PrestacaoContas** (com `ano`, `mes`, `status`, `protocolo`).
- **Tabelas de domínio** (fontes de recurso, categorias de despesa, veículos de publicação, tipos de vigência, CBO, classificação econômica).
- Estados/máquina de status alinhados ao TCESP (`Em elaboração`, `Enviado`, `Armazenado`, `Rejeitado`, `Substituído`, `Excluído`).
