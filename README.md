# LOOPMATIC - 2 — Glitch Motion Lab · v0.3.9

Aplicativo estático, sem build, conta, CDN ou envio de imagens a servidores.

## Abrir e publicar
Abra `index.html` no navegador. Para publicar no GitHub Pages, envie **todos os arquivos desta pasta** à raiz do repositório e configure Pages para servir a branch principal / root. Não basta trocar apenas o index. Nenhuma publicação no GitHub foi feita por esta entrega.

## Uso
1. Carregue imagens pelo botão ou arraste-as ao painel FILM STRIP. Cada lote é ordenado numericamente pelo nome e adicionado ao fim da sequência.
2. Escolha formato, resolução e intervalo. A resolução é o tamanho do lado maior, até 1280 px. As imagens importadas são reduzidas a no máximo 1280 px no lado maior para limitar a memória.
3. Ajuste os 12 efeitos. Cada etapa recebe o resultado acumulado anterior, incluindo Blocks e Distortion. A ordem é fixa: Pixelate → RGB → Shift → Noise → Scanlines → cor → Waves → Blocks → Distortion.
4. Clique na miniatura para pausar e editar aquele quadro. Setas navegam; espaço reproduz/pausa quando o foco está fora dos controles.
5. Desenho: arraste no preview. Texto: digite no campo, selecione Texto e clique no ponto da linha de base. Imagem: importe ou cole uma imagem copiada (Ctrl/⌘ V com foco fora dos campos), ajuste a porcentagem e clique para posicionar pelo centro. É possível repetir a inserção. Desfazer remove a última intervenção do quadro.
6. O interruptor “Aplicar efeitos também às intervenções” define se elas entram antes ou depois do processamento. Com glitch ligado, a posição visual de uma intervenção pode ser deslocada pelos efeitos.
7. Exporte GIF, WebM ou o quadro atual em PNG. O botão Tela cheia amplia o preview; Esc sai.

## Limites desta versão
- Sessão em memória: recarregar/fechar a página perde as imagens e intervenções. Ainda não existe projeto reabrível nem sincronização entre dispositivos.
- Efeitos globais ou individuais por quadro; intervenções individuais. Aleatoriedade estável por quadro garante repetibilidade do preview e exportação.
- GIF local com paleta RGB332 de 256 cores. Pode produzir arquivos maiores e gradações menos suaves que codificadores com paleta adaptativa. GIF e PNG funcionam sem worker remoto.
- WebM depende do suporte a MediaRecorder do navegador e grava em tempo real. Mantenha a aba ativa; abas em segundo plano podem alterar o tempo.
- Imagens coladas precisam estar efetivamente na área de transferência como imagem; copiar apenas um URL não importa o conteúdo.
- Textos e imagens podem ser selecionados, movidos e excluídos após a inserção. Imagens podem ser redimensionadas proporcionalmente pelas alças nos quatro cantos. Desenhos permanecem como traços sem ferramenta de movimentação.
- Upload de GIF animado trata o arquivo como uma imagem, não como uma sequência extraída. Use arquivos de quadros separados.
- A textura é procedural em SVG/CSS, inspirada na referência enviada; a foto da câmera não é usada como fundo.

© Rafael Andrade — https://www.behance.net/rafael_andrade

## Validação desta entrega
Verificação de sintaxe dos scripts; teste dos 12 efeitos isolados em canvas; repetibilidade dos efeitos aleatórios; preservação de Noise ao aplicar Blocks; decodificação independente do GIF com Pillow (2 quadros, 200 ms, loop infinito). A revisão visual e os testes de interação/WebM em navegador ficaram pendentes porque o navegador automatizado não estava disponível no ambiente.

## Novidades v0.3
- Lixeira individual e exclusão dos quadros marcados.
- Seleção por checkbox; Ctrl/⌘ + clique alterna a seleção e Shift + clique seleciona um intervalo. Clique simples define o quadro ativo e seleciona apenas ele.
- Arraste uma miniatura selecionada para mover todo o grupo marcado. Solte na metade esquerda/direita de outra miniatura para inserir antes/depois. Os botões ← e → movem a seleção um passo e também funcionam em dispositivos sem arraste.
- Duplicar cria um bloco de cópias após o último quadro selecionado. Intervenções são independentes; o sinal aleatório é preservado.
- Inverter ordem reverte os quadros selecionados nas posições que já ocupam, mantendo os não selecionados no lugar. Não espelha a imagem.
- Desfazer no Film Strip restaura até 30 operações de organização, incluindo exclusão e adição. Desfazer no Frame Studio restaura até 40 operações de objetos por quadro, incluindo movimentos.
- A seta preta seleciona textos/imagens: clique e arraste para mover; Delete/Backspace ou Excluir objeto remove o objeto selecionado. V ativa a seta quando o foco está fora dos controles.
- No modo seta, quadros com intervenções aparecem sem efeitos para posicionar objetos em suas coordenadas originais. O visor identifica esse estado. Reproduzir ou usar outra ferramenta mostra os efeitos. PNG/GIF/WebM sempre exportam o resultado final, sem contorno de seleção.

Validação v0.3: testes automatizados em DOM e canvas locais cobriram seleção, inversão, duplicação, movimentação, exclusão, restauração do último quadro, arraste simulado de texto/imagem, desfazer e independência das cópias. Os testes dos efeitos e do GIF também foram repetidos. A revisão visual em navegador continua pendente neste ambiente.

## Identidade v0.3.1
Logo principal LOOPMATIC - 2 com subtítulo à esquerda e assinatura LM-2 à direita. As imagens aprovadas estão em assets/ e são enquadradas pelo CSS, preservando os arquivos originais. Cabeçalho responsivo, título da aba, favicon, rodapé e nomes dos downloads atualizados. As funções da v0.3 foram preservadas.

Publique todos os arquivos, inclusive a pasta assets. O número 2 é parte da marca; v0.3.1 indica a versão do aplicativo.

## v0.3.2 — cabeçalho compacto e novo projeto
- Logos menores: principal com largura de 290 px e LM-2 com 66 px em desktop, reduzidos em telas pequenas.
- O fundo escuro dos arquivos originais é removido na renderização por um filtro SVG de transparência. A interface mostra somente as letras, sem mistura com uma caixa de fundo.
- Arraste arquivos de imagem sobre qualquer área da interface para adicioná-los à sequência. Um painel indica o destino. O arraste interno de miniaturas continua reordenando os quadros.
- Novo projeto limpa quadros, objetos, imagens de colagem, históricos e configurações. Havendo quadros, pede confirmação antes de descartar. Arquivos já exportados não são afetados.
- A importação bloqueia temporariamente os controles para impedir ações concorrentes durante o carregamento.

Validação desta versão em Chromium: carregamento, arraste de arquivos sobre o preview, inserção/movimento de texto, download de GIF, cancelamento e confirmação de Novo projeto; ausência de erros JavaScript e de rolagem horizontal em largura móvel. Cabeçalho inspecionado visualmente em desktop e celular. Esta validação substitui a pendência de navegador indicada no histórico acima.

## v0.3.3 — redimensionamento e efeitos por quadro
**Redimensionar imagem:** ative a seta, clique na imagem adicionada e arraste uma das quatro alças dos cantos. A proporção é preservada e o canto oposto fica fixo. Arrastar o interior continua movendo o objeto. Desfazer restaura o tamanho anterior. Textos também possuem alças de tamanho a partir da v0.3.4.

**Efeitos individuais:** selecione a miniatura do quadro e, em Signal Processor → Aplicar efeitos em, escolha Editar quadro isolado. Os controles passam a editar somente o quadro ativo, independentemente dos outros quadros marcados na seleção múltipla. Na primeira alteração, ele recebe uma cópia dos ajustes globais atuais; mudanças globais posteriores não sobrescrevem esse conjunto individual. O indicador FX na miniatura identifica os quadros personalizados.

Usar efeitos globais neste quadro remove a personalização e volta a acompanhar o conjunto global. Reset no modo individual deixa apenas esse quadro com efeitos neutros; no modo global, neutraliza os ajustes globais e preserva os quadros personalizados. Ao navegar, os controles mostram os valores correspondentes ao quadro ativo. No modo de quadro isolado, alterar um efeito pausa a reprodução e mostra imediatamente o resultado processado, mesmo em quadros com objetos. No modo global, a reprodução continua. Selecionar a seta retorna à edição dos objetos sem efeitos.

Duplicação copia os efeitos individuais sem compartilhar seus valores. Reordenação preserva o efeito de cada quadro. Preview e exportações GIF, PNG e WebM usam os mesmos ajustes por quadro.

Testes em Chromium: arraste das quatro alças, proporção, desfazer tamanho, isolamento e herança de efeitos, independência após duplicação, reordenação, download GIF/PNG e reset de projeto, sem erros JavaScript. GIF decodificado com três quadros; interface inspecionada em desktop e verificada sem overflow em largura móvel.

## v0.3.4 — tamanho dos textos pela seta
Selecione o texto inserido com a seta e arraste qualquer um dos quatro cantos para aumentar ou diminuir o tamanho. A proporção tipográfica é preservada, com o canto oposto fixo. O interior do objeto continua servindo para mover. Desfazer restaura tamanho e posição anteriores; o conteúdo e a cor do texto permanecem iguais. A exportação utiliza o tamanho final sem incluir as alças.

Validação v0.3.4 em Chromium: aumento e redução nos quatro cantos de um texto com acentos e descendentes, fixação do canto oposto, preservação do conteúdo, desfazer tamanho/posição e download PNG. Regressão de alças de imagens, efeitos individuais e exportações GIF/PNG aprovada.

## v0.3.5 — exportação MOV
O botão MOV gera um contêiner QuickTime com vídeo Photo-JPEG (identificador jpeg; decodificado como MJPEG), diretamente no navegador. Cada quadro é renderizado com seus efeitos e intervenções e codificado como JPEG em qualidade 0,95. O intervalo em milissegundos determina a duração exata de cada amostra. A saída não depende da velocidade da reprodução.

O MOV não tem áudio nem canal alfa e usa compressão JPEG com perdas. É uma opção de alta qualidade, normalmente maior que WebM. O ajuste Loop GIF continua exclusivo do GIF; MOV exporta uma passagem da sequência. A reprodução/importação depende de o programa de destino aceitar Photo-JPEG em MOV; não é ProRes ou H.264. Limite preventivo de 1 GB de dados de vídeo por exportação para reduzir consumo de memória.

Inclua o novo arquivo mov-encoder.js ao publicar no GitHub. Não há bibliotecas remotas ou envio de imagens para conversão.

Validação: download no Chromium com três quadros, efeitos individuais e texto; ffprobe identificou major_brand qt, codec jpeg/MJPEG, resolução 640×398 e duração de 0,690 s (3×230 ms). FFmpeg decodificou todos os quadros, comparados com as renderizações originais. Também foram testados projeto vazio e recuperação após erro de codificação. Não foi realizada validação em QuickTime Player ou em editores específicos no macOS.

Referência do contêiner: https://developer.apple.com/documentation/quicktime-file-format

## v0.3.6 — efeitos globais durante a reprodução
Em Sequência · global, modificar qualquer efeito ou usar Reset mantém o vídeo rodando, sem reiniciar o temporizador nem voltar ao primeiro quadro. Se o vídeo estava pausado manualmente, permanece pausado.

Escolher Editar quadro isolado pausa no quadro atual para editar apenas ele. Voltar ao modo global retoma a reprodução se ela estava ativa antes de entrar no modo isolado. Ajustes e Reset individuais continuam limitados ao quadro ativo. Os controles manuais de pausa, seleção de quadro e ferramentas de objetos permanecem disponíveis.


## v0.3.7 — Projetos editáveis
Salvar projeto baixa um arquivo .loopmatic com imagens incorporadas, ordem dos quadros, desenhos, textos e imagens como objetos, efeitos globais e individuais, intervalo e configurações de saída. Abrir projeto restaura tudo sem depender dos arquivos originais ou de conexão. A abertura valida o arquivo antes de substituir o trabalho e pede confirmação quando já existem quadros. A reprodução inicia pausada em modo global. O histórico de Desfazer e a imagem ainda não posicionada não são salvos. Limite de arquivo: 250 MB; limite de imagens decodificadas: 150 milhões de pixels. Não há salvamento automático: salve antes de fechar a aba.


## v0.3.8 — Captura de câmera
No Film Strip, Capturar imagem abre a webcam ou câmera do celular. Autorize o acesso no navegador. Capture vários quadros sem fechar a janela; cada foto é adicionada ao final e pode ser editada, reordenada, exportada e salva no projeto. Alternar câmera fica disponível quando o navegador identifica mais de uma câmera. A câmera é desligada ao fechar a janela ou sair da página. Não solicita microfone nem envia imagens a servidor. Use HTTPS no GitHub Pages (ou localhost para desenvolvimento). Capturas são limitadas a 1280 px no lado maior, como as imagens importadas.


## v0.3.9 — Abertura do projeto na edição
Corrige a tela de adicionar imagens que permanecia sobre a prévia ao abrir um projeto. A tela vazia agora acompanha a existência de quadros em cada renderização, incluindo abertura, importação, exclusão e novo projeto.
