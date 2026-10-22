# 🐾 Clínica da Dra. Lara

Presente de aniversário para a Lara, futura veterinária: simulador de atendimentos
veterinários + estudo de Biologia e Química para o ENEM, com XP, promoções de cargo
(Estagiária → Residente → Veterinária → Veterinária-chefe), cartas desbloqueáveis e a
**Mikasa**, a gatinha preta mascote.

Feito com **Vite + JavaScript puro**, GSAP (SplitText, ScrollTrigger, Flip, MorphSVG),
Lottie, canvas-confetti e Animate.css.

---

## Rodar no computador

Precisa do [Node.js](https://nodejs.org) 18 ou mais novo.

```bash
npm install      # instala tudo (só na primeira vez)
npm run dev      # abre em http://localhost:5173
npm run build    # gera a versão final em dist/
npm run preview  # testa a versão final
```

Para testar no celular: rode `npm run dev`, veja o endereço "Network" que aparece
no terminal (ex.: `http://192.168.0.10:5173`) e abra no celular conectado ao mesmo Wi-Fi.

---

## Onde editar cada coisa

| Quero mudar…                        | Arquivo                         |
|-------------------------------------|---------------------------------|
| Textos das cartas                   | `src/data/cartas.js`            |
| Fotos das cartas                    | `public/fotos/foto1.jpg` … `foto4.jpg` |
| Falas da Mikasa                     | `src/data/mascote.js`           |
| Casos clínicos                      | `src/data/casos.js`             |
| Questões do ENEM                    | `src/data/questoes.js`          |
| Cargos e quanto XP vale cada coisa  | `src/data/cargos.js`            |
| Animações Lottie                    | `public/animacoes/*.json`       |
| Desenhos dos animais e ícones       | `src/lib/ilustracoes.js`        |
| Cores (claro e escuro) e fontes     | topo de `src/styles/main.css` (`:root`) |

Todos os arquivos de `src/data/` têm comentários em português no começo explicando
cada campo e como adicionar itens novos.

### Cartas
Abra `src/data/cartas.js` e troque `titulo`, `texto` e `assinatura`. No texto, `\n\n`
começa um parágrafo novo. O campo `requisito` define quando a carta abre
(depois de X casos, X questões ou ao chegar num cargo). A carta com `final: true`
dispara a chuva de corações e, ao ser fechada, a surpresa com o bolo.

### Fotos
Coloque as fotos em `public/fotos/` com os nomes `foto1.jpg`, `foto2.jpg`, `foto3.jpg`
e `foto4.jpg` (carta 1, 2, 3 e 4). Sem a foto, a carta mostra um espaço reservado
tracejado. Para usar `.png`/`.webp`, mude o campo `foto` da carta.

### Falas da Mikasa
Em `src/data/mascote.js`, cada grupo (`dicas`, `acerto`, `erro`, `promocao`,
`secretas`…) é uma lista de frases; ela sorteia uma. Use `{nome}` e `{cargo}` dentro
das frases. As `secretas` aparecem quando a Lara toca **5 vezes seguidas** na Mikasa.

### Animações
- **Lottie:** troque os `.json` em `public/animacoes/` mantendo os nomes
  (`estetoscopio`, `cachorro`, `gato`, `coracao`, `bolo`). Veja `public/animacoes/CREDITOS.md`.
- **GSAP:** cada tela tem seu arquivo em `src/telas/` e as animações ficam juntas com
  a lógica. Os números mais úteis para ajustar são `duration` (segundos), `stagger`
  (atraso entre itens) e `ease` (o "jeito" do movimento — ex.: `elastic.out(1, 0.45)`
  na barra de XP, em `src/telas/progresso.js`).
  - Abertura (patinha + título): `src/telas/abertura.js`
  - Troca de abas: `src/telas/abas.js`
  - Cards, prontuário e Flip: `src/telas/atendimentos.js`
  - Acerto/erro: `src/telas/respostas.js`
  - XP e promoção: `src/telas/progresso.js`
  - Envelopes e surpresa: `src/telas/cartas.js`
  - Mikasa: `src/telas/mikasa.js`
- **Confetes:** `src/lib/efeitos.js`.
- **Movimento reduzido:** se o aparelho estiver com "Reduzir movimento" ligado, tudo vira
  fade simples automaticamente.

### Visual
- Fonte Manrope (sem serifa) em toda a interface; a letra manuscrita (Caveat) só nas cartas.
- Paleta: verde-clínica, mel e rosa-coral em blocos de cor cheia; o tema escuro segue o
  modo escuro do aparelho automaticamente.
- Os pacientes são desenhos SVG próprios (campo `animal` em `src/data/casos.js`).
- A barra do topo e as abas se escondem ao rolar para baixo e voltam ao rolar para cima.

### Progresso
Fica salvo no próprio aparelho (localStorage). O botão **Recomeçar**, na aba Início,
apaga tudo depois de uma confirmação.

---

## Publicar na Vercel (passo a passo)

1. **Suba o código no GitHub** (este repositório já está pronto).
2. Crie uma conta grátis em <https://vercel.com> usando **Continue with GitHub**.
3. No painel da Vercel, clique em **Add New… → Project**.
4. Em **Import Git Repository**, escolha este repositório (se não aparecer, clique em
   *Adjust GitHub App Permissions* e libere o acesso a ele).
5. A Vercel detecta **Vite** sozinha (o `vercel.json` já define tudo):
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Clique em **Deploy**. Em ~1 minuto o site fica no ar em algo como
   `https://mikasa-vet.vercel.app`.
7. A partir daí, **todo push na branch principal publica de novo** automaticamente;
   outras branches ganham um link de prévia.

### Domínio próprio (ex.: `clinicadralara.com.br`)
1. Compre o domínio (Registro.br para `.com.br`, ou direto na Vercel em **Domains → Buy**).
2. Na Vercel: abra o projeto → **Settings → Domains** → digite o domínio → **Add**.
3. A Vercel mostra os registros DNS para configurar. No painel onde comprou o domínio:
   - Domínio raiz (`clinicadralara.com.br`): registro **A** apontando para o IP que a Vercel indicar
     (normalmente `76.76.21.21`).
   - Subdomínio `www`: registro **CNAME** apontando para `cname.vercel-dns.com`.
   - *Alternativa no Registro.br:* em "DNS", troque os servidores para os nameservers da Vercel
     (`ns1.vercel-dns.com` e `ns2.vercel-dns.com`) — aí a Vercel cuida de tudo.
4. Aguarde a propagação (de minutos até algumas horas). O HTTPS é ativado sozinho.

### Instalar como app no celular
- **Android (Chrome):** abra o site → menu ⋮ → **Instalar app** / **Adicionar à tela inicial**.
- **iPhone (Safari):** abra o site → botão Compartilhar → **Adicionar à Tela de Início**.

---

## Estrutura

```
index.html              estrutura da página
src/main.js             liga tudo
src/data/               conteúdo editável (casos, questões, cartas, cargos, falas)
src/telas/              cada parte da interface + suas animações
src/lib/                GSAP, estado salvo, Lottie, confetes, avisos
src/styles/main.css     visual
public/animacoes/       arquivos Lottie (.json)
public/fotos/           fotos das cartas
public/icones/          ícones do app
public/manifest.webmanifest, public/sw.js   app instalável
vercel.json             configuração de publicação
```
