# Arquivos de logo

## A convenção

O sufixo **`-dark` diz o fundo a que a arte serve, não o tom dela**. `logo.png`
vai sobre fundo claro (texto escuro); `logo-dark.png` vai sobre fundo escuro
(texto claro). Ler ao contrário é o erro fácil aqui, e ele não quebra nada — só
deixa a marca invisível, que é pior, porque a tela continua "funcionando".

## A palette

Lida dos próprios arquivos, não de um manual:

| Elemento | Fundo claro | Fundo escuro |
|---|---|---|
| Símbolo — barra | `rgb(78,141,201)` | `rgb(78,141,201)` — **não muda** |
| Símbolo — "T" | `rgb(48,45,44)` | `rgb(237,240,244)` |
| Texto | `rgb(48,45,44)` | `rgb(237,240,244)` |

**O símbolo é bicolor.** A barra é sempre o azul da marca; o "T" acompanha a cor
do texto. Tratar o símbolo como uma cor só apaga metade dele — e o resultado
continua parecendo um logo, só que errado, que é como isso passa despercebido.

## As três famílias

| Arquivo | Tam. | Arranjo | Texto | Onde |
|---|---|---|---|---|
| `logo.png` / `logo-dark.png` | 244×78 | empilhado | escuro / claro | Sobre o sistema |
| `logo-deitada.png` / `-dark.png` | 301×82 | deitado | escuro / claro | barra superior (menu recolhido) |
| `logo-menu.png` / `logo-menu-dark.png` | 350×124 | deitado | **branco** | barra lateral |
| `logo-vertical.png` / `-dark.png` | 600×587 | vertical | escuro / claro | telas de entrada |

### Cuidado com `logo-menu`

Os dois arquivos `logo-menu*` são **iguais em cor**: texto branco puro e símbolo
azul-marinho `rgb(4,72,144)`. Servem só onde o fundo é escuro por conta própria
— o azul da barra lateral no tema claro, o `ink-900` no tema escuro. **Sobre
fundo branco some o texto e sobra o símbolo.** Foi exatamente esse o bug que deu
origem à família `logo-deitada`.

### De onde veio `logo-deitada`

Derivada de `logo-menu.png` por recolorização, não desenhada: mesma arte, mesmas
formas, com a palette acima. O mapeamento é peça a peça, e é o ponto todo:

| Na arte do menu | Vira |
|---|---|
| azul-marinho `rgb(4,72,144)` (a barra) | azul da marca |
| branco (o "T" e o texto) | cor do texto do tema |

A borda suavizada é interpolada entre as duas cores de destino na mesma
proporção em que estava entre as de origem — classificar cada pixel na força
serrilha o contorno.

A arte é **aparada na caixa útil**, ao contrário de `logo-menu.png`, que tem
moldura transparente. Por isso a mesma altura em CSS rende um logo maior aqui:
o número pedido é o que se vê.

Se a arte de origem mudar, é regerar em vez de editar à mão.
