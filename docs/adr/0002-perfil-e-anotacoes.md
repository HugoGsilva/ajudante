# Perfil consolidado e anotações soltas

O que o modelo lê em toda mensagem é um único perfil. Cada fato novo vira uma anotação. No domingo o modelo reescreve o perfil e as anotações da semana são marcadas como dobradas. Tarefa e ideia são registros diferentes: só a tarefa tem estado e aviso. A spec juntava tudo em `tasks_notes` e `user_context`; a compressão semanal precisa de um texto estável para substituir e de uma fila do que ainda não entrou nele.
