// api/scores.js — Vercel Serverless Function (CommonJS)
// Consulta API-Football e devolve placares + classificação

const NAME_MAP = {
  // América do Norte
  "Mexico":"México","Canada":"Canadá","United States":"EUA","USA":"EUA",
  // Africa
  "South Africa":"África do Sul","Morocco":"Marrocos","Egypt":"Egito",
  "Ivory Coast":"Costa do Marfim","Cote D'Ivoire":"Costa do Marfim","Côte d'Ivoire":"Costa do Marfim",
  "Ghana":"Gana","Tunisia":"Tunísia","Senegal":"Senegal","Algeria":"Argélia",
  "Cape Verde":"Cabo Verde","DR Congo":"RD Congo","Congo DR":"RD Congo",
  "New Zealand":"Nova Zelândia","Haiti":"Haiti",
  // Europa
  "England":"Inglaterra","France":"França","Spain":"Espanha","Germany":"Alemanha",
  "Portugal":"Portugal","Netherlands":"Países Baixos","Belgium":"Bélgica",
  "Croatia":"Croácia","Norway":"Noruega","Switzerland":"Suíça","Sweden":"Suécia",
  "Scotland":"Escócia","Austria":"Áustria","Czech Republic":"Rep. Tcheca","Czechia":"Rep. Tcheca",
  "Bosnia And Herzegovina":"Bósnia","Bosnia and Herzegovina":"Bósnia","Bosnia":"Bósnia",
  "Serbia":"Sérvia","Ukraine":"Ucrânia","Romania":"Romênia","Hungary":"Hungria",
  "Slovakia":"Eslováquia","Slovenia":"Eslovênia","Albania":"Albânia",
  // Ásia/Oriente Médio
  "South Korea":"Coreia do Sul","Korea Republic":"Coreia do Sul",
  "Japan":"Japão","Iran":"Irã","Iraq":"Iraque","Saudi Arabia":"Arábia Saudita",
  "Jordan":"Jordânia","Uzbekistan":"Uzbequistão","Qatar":"Catar",
  "Australia":"Austrália","Turkey":"Turquia","Turkiye":"Turquia",
  // América do Sul
  "Brazil":"Brasil","Argentina":"Argentina","Uruguay":"Uruguai","Colombia":"Colômbia",
  "Paraguay":"Paraguai","Ecuador":"Equador","Chile":"Chile","Peru":"Peru","Bolivia":"Bolívia",
  // Outros
  "Curacao":"Curaçao","Curaçao":"Curaçao","Panama":"Panamá"
};

function ptName(name) {
  if (!name) return name;
  return NAME_MAP[name] || NAME_MAP[name.trim()] || name;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const key = process.env.FOOTBALL_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "FOOTBALL_API_KEY não configurada", hint: "Configure em Vercel → Settings → Environment Variables" });
  }

  const headers = {
    "x-apisports-key": key,
    "x-rapidapi-host": "v3.football.api-sports.io"
  };
  const base = "https://v3.football.api-sports.io";

  try {
    // Busca jogos ao vivo + do dia de hoje (2 chamadas paralelas)
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const [liveRes, todayRes, standRes] = await Promise.all([
      fetch(`${base}/fixtures?league=1&season=2026&live=all`, { headers }),
      fetch(`${base}/fixtures?league=1&season=2026&date=${today}`, { headers }),
      fetch(`${base}/standings?league=1&season=2026`, { headers })
    ]);

    const liveData  = await liveRes.json();
    const todayData = await todayRes.json();
    const standData = await standRes.json();

    // Combina ao vivo + hoje, deduplica por fixture id
    const allFixtures = [...(liveData.response || []), ...(todayData.response || [])];
    const seen = new Set();
    const fixtures = allFixtures.filter(f => {
      if (seen.has(f.fixture.id)) return false;
      seen.add(f.fixture.id); return true;
    });

    const matches = fixtures.map(f => {
      const s = f.fixture.status;
      return {
        id:         f.fixture.id,
        home:       ptName(f.teams.home.name),
        away:       ptName(f.teams.away.name),
        home_raw:   f.teams.home.name,   // nome original para debug
        away_raw:   f.teams.away.name,
        score_home: f.goals.home,
        score_away: f.goals.away,
        status:     s.short,   // NS, 1H, HT, 2H, FT, AET, PEN
        minute:     s.elapsed,
        date:       f.fixture.date,
        round:      f.league.round
      };
    });

    // Classificação por grupo
    const standings = {};
    const allGroups = standData.response?.[0]?.league?.standings || [];
    allGroups.forEach(group => {
      group.forEach(team => {
        const g = (team.group || "").replace("Group ", "");
        if (!standings[g]) standings[g] = [];
        standings[g].push({
          team: ptName(team.team.name),
          rank: team.rank,
          pts:  team.points,
          j:    team.all.played,
          sg:   team.all.goals.for - team.all.goals.against
        });
      });
    });

    // Cache conservador: 45s no edge pra não perder gols
    res.setHeader("Cache-Control", "s-maxage=45, stale-while-revalidate=60");

    return res.status(200).json({
      updated:  new Date().toISOString(),
      live_count: (liveData.response || []).length,
      today_count: (todayData.response || []).length,
      matches,
      standings
    });

  } catch (err) {
    console.error("Erro API-Football:", err);
    return res.status(500).json({ error: err.message });
  }
};
