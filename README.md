# Alpine Escape

**Alpine Escape** é um jogo independente para navegador, inspirado no clássico **SkiFree (1991)**, de Chris Pirih: desça a montanha, desvie dos obstáculos, execute manobras e tente escapar dos Pés Grandes.

O jogo usa HTML, CSS e JavaScript puro, com gráficos desenhados em Canvas e áudio sintetizado.

## Como jogar

Abra o arquivo **index.html** em um navegador moderno e clique em **Começar a descida**. Não é necessário instalar dependências ou compilar o projeto.

Se preferir usar um servidor local, abra o terminal na pasta `alpine-escape` e execute:

```powershell
python -m http.server 8080
```

Acesse **http://localhost:8080**. Para encerrar o servidor, pressione **Ctrl+C**.

O som vem ligado por padrão e começa após a interação que inicia a partida. Clique em **SOM ON** para silenciar e em **SOM OFF** para reativar.

## Controles

| Tecla | No chão | No ar |
| --- | --- | --- |
| ← / A | Virar à esquerda | Deslocar e girar à esquerda |
| → / D | Virar à direita | Deslocar e girar à direita |
| ↑ / W | Frear | Executar backflip |
| ↓ / S | Acelerar | Acelerar |
| ↑ + ← ou → | Frear e virar | Combinar pirueta e giro: corkscrew |
| Espaço | Saltar | Aguarde o pouso para saltar novamente |
| F, segurado | Turbo | Turbo |
| X | Gritar contra os Pés Grandes | Gritar contra os Pés Grandes |
| P / Escape / F3 | Pausar ou continuar | Pausar ou continuar |
| F2 | Reiniciar a partida | Reiniciar a partida |

Em dispositivos com tela de toque, os controles aparecem na parte inferior. É possível usar **GRITO** e **TURBO** em conjunto. O botão **FREIO** funciona como backflip durante o salto.

A partida pausa automaticamente quando a janela perde o foco ou a aba fica oculta.

## Modalidades

- **Livre:** explore a descida e sobreviva aos obstáculos.
- **Slalom:** passe entre as bandeiras para pontuar. Cada porta perdida acrescenta cinco segundos de penalidade ao resultado exibido da prova.
- **Estilo livre:** execute saltos e manobras com pontuação dobrada.

As provas de slalom e estilo livre terminam aos **1.000 metros**, mas a descida continua até a captura.

## Obstáculos, saltos e fogo

Árvores, pedras e outros esquiadores podem derrubar você, reduzindo a velocidade e retirando **25 pontos**, sem deixar a pontuação negativa.

Pressione **Espaço** para saltar ou passe por uma rampa com velocidade suficiente. Não é possível saltar novamente ainda no ar ou enquanto estiver caído. O salto manual dura aproximadamente **1,65 segundo**; rampas podem proporcionar mais tempo no ar.

Durante o salto, use as direções para deslocar o esquiador e completar manobras. Manter uma combinação pressionada permite repetir movimentos enquanto houver tempo. Movimentos incompletos não pontuam, e mudar de combinação reinicia o progresso da manobra em execução.

Passar sobre uma árvore na parte alta do salto faz essa árvore pegar fogo, com chamas e fumaça animadas. Cada árvore concede esse bônus uma única vez. Com o som ligado, o jogo reproduz um efeito de fogo e a fala **“Fire!”**.

## Pontuação

| Ação | Pontos básicos |
| --- | ---: |
| Movimento lateral no ar | 40 |
| Backflip completo | 180 |
| Corkscrew completo | 350 |
| Incendiar uma árvore durante o salto | 300 |
| Passar por uma porta de slalom | 100 |

As manobras e os bônus de árvores no mesmo salto compõem um combo. O multiplicador começa em **1×**, aumenta **0,5** a cada ação e chega a **3,5×**. No estilo livre, esses pontos são dobrados.

O pouso concede um bônus adicional proporcional à duração do salto, também dobrado no estilo livre. Os pontos das manobras são creditados ao completar cada movimento.

## Descida e perseguições

A descida normal, em linha reta, sem turbo nem colisões, leva aproximadamente **um minuto até os 2.000 metros**. Curvas, freios e quedas aumentam esse tempo; aceleração e turbo o reduzem.

### Aos 2.000 metros

O primeiro Pé Grande corre por trás do esquiador, começando fora da área visível e entrando pela parte superior da tela. Pressione **X** para gritar: ele foge e não retorna nessa partida. Se alcançar o esquiador no chão antes disso, a partida termina.

### Aos 3.000 metros

Três Pés Grandes iniciam uma nova perseguição, todos por trás, entrando gradualmente na tela. O grito faz o grupo hesitar por **3,5 segundos**. Segure **F** para aproveitar esse intervalo e ganhar distância.

O grito recarrega em **sete segundos**. Os monstros retomam a perseguição e ficam mais rápidos ao longo do último quilômetro. Eles podem capturar você antes, sobretudo após uma queda ou freada, mas alcançarão o esquiador **até os 4.000 metros**, mesmo usando gritos, turbo ou saltos.

O grito continua funcionando com o som desligado. O recorde de distância é salvo neste navegador quando o armazenamento local está disponível.

## Áudio e compatibilidade

O vento, os efeitos e o acompanhamento musical usam **Web Audio**. A fala **“Fire!”** usa a síntese de voz do navegador: o timbre e a disponibilidade dependem das vozes instaladas. Sem suporte à fala, permanece o efeito sonoro de fogo. Não é utilizada a gravação original de Street Fighter.

Os arquivos do jogo não dependem de bibliotecas ou recursos externos. A fala pode depender do serviço de voz do navegador ou do sistema.

A implementação se destina a navegadores modernos, como Chrome, Edge e Firefox. Aparência, áudio e controles por toque devem ser conferidos no navegador e dispositivo de destino.

## Estrutura do projeto

```text
alpine-escape/
├── index.html    # Interface, menus e controles
├── style.css     # Estilos e adaptação para telas menores
├── game.js       # Jogabilidade, desenho, áudio e pontuação
├── test.cjs      # Testes automatizados com ambiente Canvas simulado
├── LICENSE       # Licença com atribuição visível
└── README.md     # Documentação do projeto
```

## Desenvolvimento e testes

Edite os arquivos diretamente e recarregue a página para conferir as alterações. Não há etapa de build nem dependências de pacotes.

Com Node.js instalado, execute na pasta do projeto:

```powershell
node --check game.js
node test.cjs
```

Os testes cobrem movimento, pausa, colisões, slalom, tempo de descida, saltos, manobras, combos, árvores em chamas, chamada de voz, reinício e perseguições. Também verificam a vantagem de combinar grito e turbo e a captura até os 4.000 metros.

Os testes usam um Canvas simulado e não verificam a aparência final nem a saída de áudio em um navegador real.

## Créditos e referência

Versão web por **[realzurr](https://github.com/realzurr)**.

Inspirado em **SkiFree**, criado por **Chris Pirih** em 1991. Referência histórica: [página oficial do SkiFree](https://ski.ihoc.net/).

Este projeto é uma recriação independente com regras personalizadas, gráficos e sons próprios. A física, os percursos e a pontuação não reproduzem exatamente o executável original. Os números de velocidade são indicadores de jogo.

## Licença

O projeto usa a **[Alpine Escape - Visible Attribution License](LICENSE)**, uma licença personalizada com atribuição visível. Copyright (c) 2026 realzurr. Ela substitui a MIT para as cópias oferecidas sob estes novos termos; não é a licença MIT nem a AGPL.

É permitido usar, modificar, distribuir e comercializar o projeto, desde que sejam preservados os avisos da licença e os créditos visíveis no menu principal ou rodapé das versões interativas distribuídas ou disponibilizadas publicamente:

- **Versão web original por realzurr** — https://github.com/realzurr
- **Inspirado em SkiFree (1991), criado por Chris Pirih** — https://ski.ihoc.net/

Os créditos devem ser legíveis; guardá-los apenas no código ou no arquivo de licença não atende à condição. Quem publicar uma versão modificada deve identificá-la como tal e pode acrescentar seus próprios créditos.

Não há obrigação de publicar o código das modificações ou avisar realzurr. A licença não abrange o executável original de SkiFree nem materiais e marcas de terceiros. Permissões já concedidas a quem recebeu cópias sob a MIT continuam válidas para essas cópias.
