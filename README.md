# 🌸 Flowers — Bot de Reviver Chat

Bot Discord em Node.js que manda uma mensagem automaticamente quando um canal fica sem mensagens.

## Comandos

- `/config canal #canal` — escolhe o canal.
- `/config tempo 30` — define o tempo em minutos.
- `/config ativar` — liga o reviver.
- `/config desativar` — desliga.
- `/config status` — mostra as configurações.
- `/config testar` — manda uma mensagem de teste.

## Rodar no computador

1. Instale Node.js 22.
2. Abra a pasta no terminal.
3. Rode `npm install`.
4. Copie `.env.example` para `.env`.
5. Preencha `DISCORD_TOKEN` e `CLIENT_ID`.
6. Opcionalmente coloque `GUILD_ID`.
7. Rode `npm start`.

## Permissões

O bot precisa conseguir:
- Ver o canal
- Enviar mensagens
- Ver histórico de mensagens

Para configurar os comandos, quem usar `/config` precisa ter `Gerenciar Servidor`.

## Observação sobre hospedagem gratuita

O `config.json` guarda as configurações localmente. Em hospedagens gratuitas sem armazenamento persistente, essas configurações podem ser perdidas quando a instância é recriada. Para um bot maior, use um banco de dados.

A hospedagem gratuita da Koyeb atualmente oferece uma Free Instance para Web Service, mas ela pode reduzir a zero após 1 hora sem tráfego; portanto, não é garantia de um bot Discord 24/7. Veja o tutorial no guia entregue junto do projeto.
