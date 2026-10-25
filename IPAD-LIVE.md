# Duelo de Presentes — LIVE pelo iPad (sem o PC de casa)

Como funciona: o "cérebro" do duelo fica num servidor grátis na internet (Render).
Ele escuta os presentes da sua live e manda pro placar. No iPad você só usa
links: um para o **overlay** (o que aparece na live) e um para o **painel** (onde você mexe).

```
TikTok LIVE → servidor no Render → link do overlay → PRISM no iPad → TikTok LIVE
```

---

## PARTE 1 — Colocar o servidor no ar (uma vez só, ~15 min)

### 1. Preparar os arquivos no iPad
1. Salve o `Duelo-iPad.zip` no app **Arquivos**.
2. Toque nele uma vez: o iPad cria a pasta `Duelo-iPad`.

### 2. GitHub (guarda os arquivos) — grátis
1. No Safari, abra **github.com** e crie uma conta (se ainda não tiver).
2. Toque em **+** → **New repository**. Nome: `duelo-presentes`. Pode deixar **Private**. Toque em **Create repository**.
3. Toque em **uploading an existing file** (ou **Add file → Upload files**).
4. Toque em **choose your files**, entre na pasta `Duelo-iPad`, selecione **todos os arquivos** e confirme.
5. Desça e toque em **Commit changes**.

### 3. Render (roda o servidor) — grátis
1. Abra **render.com** → **Get Started** → entre com a conta do **GitHub**.
2. Toque em **New +** → **Blueprint**.
3. Escolha o repositório `duelo-presentes` (se não aparecer, toque em configurar o acesso do GitHub e libere ele).
4. O Render lê o arquivo `render.yaml` e pede duas coisas:
   - **TIKTOK_USERNAME** → seu @ do TikTok, sem o @
   - **SENHA_PAINEL** → invente uma senha (é para o painel; não é a senha do TikTok)
5. Toque em **Apply** e espere uns 3 minutos até aparecer **Live**/**Deployed**.
6. No topo aparece seu endereço, algo como `https://duelo-presentes-xxxx.onrender.com`. **Esse é o seu link.**

> Nunca coloque a senha do TikTok em lugar nenhum. O sistema não precisa dela.

---

## PARTE 2 — Testar no Safari (2 min)

1. Abra **seu link + `/admin`**. Ex.: `https://duelo-presentes-xxxx.onrender.com/admin`
2. Digite a **SENHA_PAINEL**.
3. Em **🧪 Simular presente**, toque em **+1 rosa branca** e em **−10 capybara**.
   A **Prévia ao vivo** deve mostrar a mão apertando o verde / o vermelho e o placar mudando.
4. No mesmo painel você troca: fotos (📷 Escolher foto), nomes, cores, presentes, pontos, máximo, e pode **Zerar** ou **Definir placar**.

---

## PARTE 3 — Transmitir pelo próprio app do TikTok (RECOMENDADO, sem Stream Key)

O TikTok transmite **a tela do iPad**. Na tela fica o duelo aberto. Os presentes chegam e o placar muda ao vivo.

### Deixar o duelo em tela cheia (uma vez)
1. No Safari, abra **seu link** (sem `/admin`).
2. Toque em **Compartilhar** (quadrado com seta) → **Adicionar à Tela de Início** → **Adicionar**.
3. Agora abra o duelo pelo ícone **Duelo** na tela de início: ele abre em tela cheia, sem barra do Safari.
4. Deixe o iPad **em pé** (vertical) e trave a rotação na Central de Controle.
5. Em **Ajustes → Tela e Brilho → Bloqueio Automático → Nunca** (para a tela não apagar no meio da live).
6. Ative o **Não Perturbe** (para notificações não aparecerem na live).

### Começar a live
1. Abra o **TikTok** → **+** → **LIVE**.
2. Embaixo do botão, escolha **Jogos móveis** (ou "Compartilhar tela").
3. Escolha **Retrato/Vertical**, coloque o título → **Iniciar LIVE**.
4. Vai aparecer a janela do iPad **"Transmissão de Tela"**: confirme que está selecionado **TikTok** e toque em **Iniciar Transmissão**. Espere a contagem 3‑2‑1.
   (Se a live ficar com tela preta, foi esse passo que não rodou: segure o botão de gravar tela na Central de Controle → TikTok → Iniciar Transmissão.)
5. Saia do TikTok e abra o ícone **Duelo**. Pronto: o público vê o duelo e o seu microfone.
6. Para ler os comentários, volte ao TikTok rapidinho (o público vê essa troca) ou use outro celular para acompanhar a live.

Atenção: tudo o que aparecer na tela vai para a live. Não abra WhatsApp, fotos ou o `/admin` durante a transmissão
(use o painel em outro aparelho, se precisar).

Requisitos do TikTok para essa opção: 18+ e número mínimo de seguidores (o TikTok decide; varia por conta).
Se a opção **Jogos móveis** não aparecer para você, o TikTok ainda não liberou para a sua conta.

---

## PARTE 3B — Montar a live no PRISM (só se tiver Stream Key)

1. Instale o **PRISM Live Studio** (App Store, grátis).
2. Deixe a transmissão em **vertical (9:16)**.
3. Na tela principal, deslize para a direita para abrir **My Studio** → **Widget** → **Web Page**.
4. Cole **seu link** (sem `/admin`). Ex.: `https://duelo-presentes-xxxx.onrender.com/`
5. Estique o widget para **ocupar a tela toda** e trave a camada.

### Saída para o TikTok
O PRISM manda a live para o TikTok por **RTMP** (Server URL + Stream Key):

1. No Safari, abra `livecenter.tiktok.com/producer`.
   Se abrir a versão de celular, toque em **aA** → **Solicitar Site para Computador**.
2. Escolha categoria e título → **Save & Go LIVE**.
3. No fim da página aparecem **Server URL** e **Stream Key**.
4. No PRISM, adicione um canal **Custom RTMP** e cole os dois.
5. Comece a transmissão no PRISM.

Atenção:
- O TikTok só mostra a Stream Key para contas liberadas (em geral 18+, 1.000+ seguidores, sem punições — e mesmo assim depende do TikTok).
- A chave pode mudar a cada live: pegue de novo antes de cada transmissão.
- **Nunca** mande a Stream Key no Notion, chat ou print.

**Se a sua conta não tiver Stream Key:** use a PARTE 3 (transmissão de tela pelo app do TikTok).

---

## TODA VEZ QUE FOR FAZER LIVE

1. **1 minuto antes**, abra seu link no Safari (o servidor grátis "dorme" quando ninguém usa e leva ~1 min para acordar).
2. Abra o **/admin** e confira: **● Conectado na live** aparece depois que a live começa (ele tenta sozinho a cada 20 s).
3. Teste com um presente barato de verdade (Rosa = 1 moeda) e veja se o placar mexe.
4. Se o Wi-Fi/5G cair, o overlay reconecta sozinho; o placar fica guardado no servidor.

---

## Custos e limites (nada foi assinado)

| Serviço | Custo | Limite que importa |
|---|---|---|
| GitHub | Grátis | — |
| Render (plano Free) | Grátis | 750 h/mês; dorme após 15 min sem uso (acorda em ~1 min). Ao reiniciar/dormir, **placar e fotos enviadas pelo painel voltam ao padrão** |
| PRISM Live Studio | Grátis | Versão grátis tem marca d'água; tirar é pago (Plus, no app). Não é obrigatório |
| Biblioteca do TikTok | Grátis | Não oficial: pode parar se o TikTok mudar algo |

**Para a foto não sumir quando o servidor dormir:** suba a imagem no GitHub junto com os outros arquivos
(ex.: `ladoA.jpg`) e no painel, em "…ou link da imagem", escreva `/ladoA.jpg`.
Para mudar o padrão permanente (nomes, presentes, pontos), edite o `config.json` no GitHub; o Render atualiza sozinho.

---

## Problemas comuns

- **Painel diz "Defina SENHA_PAINEL"** → no Render: seu serviço → **Environment** → adicione `SENHA_PAINEL` → **Save**.
- **"Sem live ativa em @…"** → normal antes de você começar a live. Confira se o @ está certo no painel.
- **Presente não conta** → no Render, abra **Logs**: aparece o nome exato do presente (ex.: "Capybara"). Coloque igual no painel.
- **Link não abre / demora** → o servidor estava dormindo; espere 1 minuto e recarregue.
