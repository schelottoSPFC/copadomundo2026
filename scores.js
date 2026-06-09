// api/scores.js — Vercel Serverless Function
// Consulta API-Football e devolve placares + classificação
// Variável de ambiente: FOOTBALL_API_KEY (configure no painel do Vercel)

const NAME_MAP = {
  "Mexico":"México","South Africa":"África do Sul","South Korea":"Coreia do Sul",
  "Czech Republic":"Rep. Tcheca","Czechia":"Rep. Tcheca",
  "Canada":"Canadá","Qatar":"Catar","Switzerland":"Suíça",
  "Bosnia And Herzegovina":"Bósnia","Bosnia and Herzegovina":"Bósnia",
  "Brazil":"Brasil","Morocco":"Marrocos","Haiti":"Haiti","Scotland":"Escócia",
  "USA":"EUA","United States":"EUA","Paraguay":"Paraguai","Australia":"Austrália",
  "Turkey":"Turquia","Turkiye":"Turquia",
  "Germany":"Alemanha","Curacao":"Curaçao","Curaçao":"Curaçao",
  "Ivory Coast":"Costa do Marfim","Cote D'Ivoire":"Costa do Marfim",
  "Ecuador":"Equador",
  "Netherlands":"Países Baixos","Japan":"Japão","Tunisia":"Tunísia","Sweden":"Suécia",
  "Belgium":"Bélgica","Egypt":"Egito","Iran":"Irã","New Zealand":"Nova Zelândia",
  "Spain":"Espanha","Cape Verde":"Cabo Verde","Saudi Arabia":"Arábia Saudita","Uruguay":"Uruguai",
  "France":"França","Senegal":"Senegal","Norway":"Noruega","Iraq":"Iraque",
  "Argentina":"Argentina","Algeria":"Argélia","Austria":"Áustria","Jordan":"Jordânia",
  "Portugal":"Portugal","Uzbekistan":"Uzbequistão","Colombia":"Colômbia",
  "DR Congo":"RD Congo","Congo DR":"RD Congo",
  "England":"Inglaterra","Croatia":"Croácia","Ghana":"Gana","Panama":"Panamá"
};

function ptName(en) {
  return NAME_MAP[en] || en;
}

export default async function handler(req, res) {
  const key = process.env.FOOTBALL_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "FOOTBALL_API_KEY não configurada" });
  }

  const headers = { "x-apisports-key": key };
  const base = "https://v3.football.api-sports.io";

  try {
    const [fixRes, standRes] = await Promise.all([
      fetch(`${base}/fixtures?league=1&season=2026`, { headers }),
      fetch(`${base}/standings?league=1&season=2026`, { headers })
    ]);

    const fixData = await fixRes.json();
    const standData = await standRes.json();

    // --- Partidas ---
    const matches = (fixData.response || []).map(f => {
      const s = f.fixture.status;
      return {
        home: ptName(f.teams.home.name),
        away: ptName(f.teams.away.name),
        score_home: f.goals.home,
        score_away: f.goals.away,
        status: s.short,       // NS, 1H, HT, 2H, FT, AET, PEN, SUSP, PST
        minute: s.elapsed,
        date: f.fixture.date,
        round: f.league.round  // "Group A - 1", "Group A - 2", etc.
      };
    });

    // --- Classificação por grupo ---
    const standings = {};
    const allGroups = standData.response?.[0]?.league?.standings || [];
    allGroups.forEach(group => {
      group.forEach(team => {
        const g = (team.group || "").replace("Group ", "");
        if (!standings[g]) standings[g] = [];
        standings[g].push({
          team: ptName(team.team.name),
          rank: team.rank,
          pts: team.points,
          j: team.all.played,
          v: team.all.win,
          e: team.all.draw,
          d: team.all.lose,
          gf: team.all.goals.for,
          ga: team.all.goals.against,
          sg: team.all.goals.for - team.all.goals.against
        });
      });
    });

    // Cache de 60s no edge, revalidação por mais 120s
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    res.setHeader("Access-Control-Allow-Origin", "*");

    return res.status(200).json({
      updated: new Date().toISOString(),
      matches,
      standings
    });

  } catch (err) {
    console.error("Erro ao consultar API-Football:", err);
    return res.status(500).json({ error: err.message });
  }
}
