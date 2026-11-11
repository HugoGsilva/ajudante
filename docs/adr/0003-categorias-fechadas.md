# Categorias fechadas e valor em centavos

O modelo só pode escolher uma categoria da lista do sistema. Valor desconhecido cai em Outros ou Outras entradas e pede confirmação. O valor é guardado em centavos, sempre positivo; o tipo (gasto, receita ou transferência) diz o sentido. Transferência cobre o pagamento de fatura, que existe nos dois CSVs do Nubank e não entra no saldo. A spec deixava categoria e float livres; isso gravaria rótulos inventados e arredondamento de dinheiro.
