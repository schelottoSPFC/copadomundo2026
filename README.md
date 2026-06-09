# Bolão Copa 2026 — Painel ao vivo

Painel para acompanhar suas apostas da Copa do Mundo 2026 com atualização automática de placares e classificação.

## Como funciona

O projeto tem duas partes:

1. **public/index.html** — o painel que você já conhece, agora com um script que busca dados a cada 90 segundos e atualiza placares e tabelas dos grupos sozinho.
2. **api/scores.js** — uma "função serverless" (um mini-servidor) que roda no Vercel. Ela consulta a API de futebol com a sua chave (protegida) e devolve os dados pro painel em formato JSON.

O Vercel hospeda as duas partes de graça.

## Passo a passo para publicar

### 1. Consiga uma chave da API-Football

Acesse https://www.api-football.com e crie uma conta gratuita.
O plano gratuito dá 100 requisições por dia — suficiente para o painel.
Copie a sua chave (API key) gerada no painel.

### 2. Crie uma conta no Vercel

Acesse https://vercel.com e faça login (pode usar sua conta do GitHub, GitLab ou email).

### 3. Suba o projeto

Existem duas formas. Escolha a mais fácil pra você:

**Opção A — Pelo GitHub (recomendado)**

1. Crie um repositório no GitHub (público ou privado).
2. Suba a pasta do projeto (com api/, public/, package.json) para o repositório.
3. No Vercel, clique em "Add New Project" e importe o repositório.
4. O Vercel detecta a estrutura automaticamente.

**Opção B — Pelo terminal (Vercel CLI)**

1. Instale o CLI do Vercel:
```bash
npm install -g vercel
```
2. Dentro da pasta do projeto, rode:
```bash
vercel
```
3. Siga as instruções (login, nome do projeto, etc.).

### 4. Configure a variável de ambiente

No painel do Vercel (https://vercel.com → seu projeto → Settings → Environment Variables):

| Nome | Valor |
|------|-------|
| FOOTBALL_API_KEY | sua_chave_da_api_aqui |

Após adicionar, faça um novo deploy (ou o Vercel redeploy sozinho se estiver conectado ao GitHub).

### 5. Pronto!

O Vercel gera uma URL tipo `https://copa-2026-live.vercel.app`. Abra no navegador e o painel estará no ar, buscando dados ao vivo assim que os jogos começarem.

## Estrutura do projeto

```
copa-2026-live/
├── public/
│   └── index.html      ← O painel completo (abas, grupos, jogos, múltiplas)
├── api/
│   └── scores.js        ← Função que consulta a API-Football
├── package.json          ← Configuração mínima
├── .env.example          ← Modelo das variáveis de ambiente
└── README.md             ← Este arquivo
```

## Como funciona a atualização ao vivo

Quando o painel abre, ele chama `GET /api/scores` automaticamente e repete a cada 90 segundos. Se a aba do navegador estiver em segundo plano, ele pausa (economiza a cota de API). Ao voltar para a aba, busca imediatamente.

A função serverless:
- Faz duas chamadas paralelas à API-Football (fixtures + standings).
- Traduz os nomes das seleções do inglês para o português.
- Devolve um JSON leve com placares e classificação.
- Faz cache de 60 segundos no edge do Vercel (reduz o uso da sua cota).

O frontend:
- Atualiza os placares na aba "Jogos · 1ª fase" (com destaque verde para jogos ao vivo).
- Reordena as tabelas dos 12 grupos pela classificação real.
- Mostra um indicador "Ao vivo · HH:MM" no cabeçalho.

## Usando outra API de futebol

Se você já tem outra API (Football-Data.org, SportRadar, etc.), edite o arquivo `api/scores.js`:

1. Troque a URL do endpoint.
2. Troque o header de autenticação.
3. Ajuste o mapeamento de campos na resposta para seguir o mesmo formato:

```json
{
  "updated": "2026-06-13T19:00:00Z",
  "matches": [
    {
      "home": "Brasil",
      "away": "Marrocos",
      "score_home": 2,
      "score_away": 1,
      "status": "FT",
      "minute": null,
      "round": "Group C - 1"
    }
  ],
  "standings": {
    "C": [
      { "team": "Brasil", "rank": 1, "pts": 3, "j": 1, "sg": 1 }
    ]
  }
}
```

Os nomes das seleções devem ser em português, exatamente como estão no painel (ex: "Países Baixos", "Rep. Tcheca", "Bósnia"). Use o dicionário NAME_MAP em `api/scores.js` como referência.

## Customizações úteis

**Trocar a frequência de atualização:**
No final de `public/index.html`, o número `90000` (milissegundos) define o intervalo. Mude para `60000` (1 minuto) ou `30000` (30 segundos) — mas lembre da cota da API.

**Compartilhar com amigos:**
É só enviar a URL do Vercel. O painel é público por padrão. Se quiser proteger com senha, ative a proteção de deploy no Vercel (recurso Pro, pago).

## Custos

Tudo grátis no uso normal:
- Vercel Free: até 100 GB de banda e 100.000 invocações serverless/mês.
- API-Football Free: 100 chamadas/dia (a cada 90 segundos durante um jogo de 2h = ~80 chamadas).

Para acompanhar vários jogos simultâneos, considere o plano Basic da API-Football (~$10/mês, 7.500 chamadas/dia).
