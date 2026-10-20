# ⚙ Config Mods para o Claude Code

**As opções de todos os seus mods num painel só, dentro do app desktop.** Sem abrir o `/config` de um terminal: escolha, digite e salve ao lado da conversa.

![Licença MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-blue)
![Claude Code](https://img.shields.io/badge/Claude%20Code-mod-D97757)

## Recursos

- **Um cartão por mod**, com nome amigável; os seus mods primeiro e os internos do Claude Code numa seção no fim.
- **O campo certo para cada opção**: lista para escolhas, botão para ligado/desligado, campo para texto e número.
- **Listas inteligentes**: o "Nome da voz" do [Modo Jarvis](https://github.com/niuarque-br/mods-jarvis) vira uma lista com as vozes de quem fala (Edge ou OpenAI).
- **Grava pelo mesmo caminho do `/config`**: o que muda aqui é o mesmo que mudaria lá, e uma recusa aparece com o motivo.
- **Botão na faixa acima do prompt** (**⚙ Config Mods**), ao lado dos botões de outros mods.

## Requisitos

- Claude Code com suporte a mods. Funciona no app desktop e no terminal; no app do celular as opções aparecem só para leitura.

## Instalar

No prompt de uma sessão do Claude Code no terminal:

```
/plugin install mods-config --marketplace niuarque-br/mods-config
```

Responda `y` para adicionar o marketplace e escolha onde instalar. Ou, de um shell:

```bash
claude plugin install mods-config --marketplace niuarque-br/mods-config
```

Depois abra uma sessão nova ou rode `/reload-plugins`.

## Usar

1. Clique em **⚙ Config Mods** acima do prompt, ou digite `/mods-config`. O painel **Configurações dos mods** abre ao lado da conversa.
2. Mude o que quiser:

| Tipo de opção | Como muda | Quando grava |
|---|---|---|
| Lista | escolha o valor | na hora |
| Ligado/desligado | clique no botão | na hora |
| Texto ou número | edite o campo | com Enter, ou pelo **Salvar** do cartão (grava tudo o que foi editado nele) |

3. O topo do painel confirma em verde ("Salvo: …") ou explica a recusa em vermelho.

Alguns mods só usam o valor novo depois de desligados e ligados de novo.

## O que fica de fora

- **Chaves secretas** (de APIs, por exemplo): o Claude Code não as mostra a outros mods. Continuam no `/config` de um terminal.
- **Opções do próprio Claude Code** (tema, modelo…): o painel mostra só as dos mods.
- **Opções travadas pela organização** aparecem com "(bloqueado)" e não podem ser mudadas.

## Desenvolvimento

```bash
claude plugin validate .
```

```bash
claude plugin test .
```

Para testar sem instalar: `claude --plugin-dir <pasta do repositório>`.

## Licença

[MIT](LICENSE) © 2026 Niuarque Batista
