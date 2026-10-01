# Equipe de bots

Cinco bots trabalham na calculadora como uma pequena empresa. O Trello é a memória
compartilhada e o GitHub guarda o código. Tudo roda na nuvem (Claude Code na web),
então nenhum computador precisa ficar ligado.

```
 Cliente ──cria pedidos──▶ Backlog
                              │ PO refina e prioriza
                              ▼
                           A fazer ──Dev puxa──▶ Em andamento ──PR aberto──▶ Revisão
                              ▲                                              │
                              │            QA reprova (volta ao topo)        │ QA aprova e faz merge
                              └──────────────────────────────────────────────┤
                                                                             ▼
                                                                         Concluído
 Supervisor: observa tudo, cobra quem travou e manda o resumo diário.
```

## Papéis

| Bot | Arquivo | Quando roda | O que faz |
| --- | --- | --- | --- |
| Supervisor | `supervisor.md` | 17h45, dias úteis | Detecta cards parados, cobra os bots e resume o dia |
| PO / Scrum Master | `po.md` | 9h, dias úteis + quando avisado | Refina pedidos, prioriza, mantém 2 a 4 cards em A fazer |
| Desenvolvedor | `developer.md` | a cada 3 horas (8h–20h, dias úteis) + quando avisado | Implementa um card por vez, abre PR, move para Revisão |
| QA | `qa.md` | a cada 3 horas (9h–21h, dias úteis) + quando avisado | Testa código e UX no navegador, aprova (merge) ou reprova |
| Cliente | `client.md` | 15h, dias úteis + quando avisado | Usa a calculadora como usuário e cria pedidos [Cliente] |

Horários em Brasília. As rotinas agendadas são só a rede de segurança: o fluxo
normal anda pelos avisos que um bot manda para o outro assim que termina algo.

## Como os bots se comunicam

- Cada bot é uma sessão persistente do Claude Code com o repositório anexado.
- Um bot avisa o outro com `send_message` (ferramenta `claude-code-remote`),
  usando o ID de sessão listado no card `[Regras]` do Trello.
- Toda decisão importante também vira comentário no card do Trello, para ficar registrada.

## Fluxo de Git

- `main` é a branch estável. Ninguém faz push direto nela.
- O Desenvolvedor trabalha na branch `bot/dev`, um card por vez, e abre um PR para `main`.
- O QA revisa o PR. Aprovado: faz merge (squash) e move o card para Concluído.
  Reprovado: comenta no PR e no card e devolve o card para o topo de A fazer.
- Depois do merge, o Desenvolvedor atualiza `bot/dev` a partir de `main` antes do próximo card.

## Fim do trabalho

O fluxo só para quando A fazer e Backlog estiverem vazios e o Cliente comentar
"Produto aprovado" no card `[Regras]`.
