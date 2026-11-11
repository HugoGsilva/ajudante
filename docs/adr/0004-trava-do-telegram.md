# Trava do Telegram por um único id

Toda atualização do Telegram é descartada, sem resposta, quando o id de quem enviou não é `TELEGRAM_OWNER_ID`. Se a variável estiver vazia, ninguém passa. O id fica no ambiente, não no código, para não ir parar no git. A spec pedia o id cravado no fonte; o efeito é o mesmo e o repositório não carrega o identificador do dono.
