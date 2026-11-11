# tRPC no painel, domínio no mesmo processo do bot

O painel fala com o servidor por tRPC. O bot do Telegram chama as mesmas funções em processo, sem HTTP interno e sem uma API REST paralela. Um único processo Hono também dispara o webhook e os horários. A spec pedia REST e um cron de sistema; a stack escolhida já é tRPC, e um segundo contrato só para o painel duplicaria a regra de negócio.
