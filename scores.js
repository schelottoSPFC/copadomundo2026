// api/scores.js â€” Vercel Serverless Function (CommonJS)
// Consulta API-Football e devolve placares + classificaÃ§Ã£o

const NAME_MAP = {
  // AmÃ©rica do Norte
  "Mexico":"MÃ©xico","Canada":"CanadÃ¡","United States":"EUA","USA":"EUA",
  // Africa
  "South Africa":"Ãfrica do Sul","Morocco":"Marrocos","Egypt":"Egito",
  "Ivory Coast":"Costa do Marfim","Cote D'Ivoire":"Costa do Marfim","CÃ´te d'Ivoire":"Costa do Marfim",
  "Ghana":"Gana","Tunisia":"TunÃ­sia","Senegal":"Senegal","Algeria":"ArgÃ©lia",
  "Cape Verde":"Cabo Verde","DR Congo":"RD Congo","Congo DR":"RD Congo",
  "New Zealand":"Nova ZelÃ¢ndia","Haiti":"Haiti",
  // Europa
  "England":"Inglaterra","France":"FranÃ§a","Spain":"Espanha","Germany":"Alemanha",
  "Portugal":"Portugal","Netherlands":"PaÃ­ses Baixos","Belgium":"BÃ©lgica",
  "Croatia":"CroÃ¡cia","Norway":"Noruega","Switzerland":"SuÃ­Ã§a","Sweden":"SuÃ©cia",
  "Scotland":"EscÃ³cia","Austria":"Ãustria","Czech Republic":"Rep. Tcheca","Czechia":"Rep. Tcheca",
  "Bosnia And Herzegovina":"BÃ³snia","Bosnia and Herzegovina":"BÃ³snia","Bosnia":"BÃ³snia",
  "Serbia":"SÃ©rvia","Ukraine":"UcrÃ¢nia","Romania":"RomÃªnia","Hungary":"Hungria",
  "Slovakia":"EslovÃ¡quia","Slovenia":"EslovÃªnia","Albania":"AlbÃ¢nia",
  // Ãsia/Oriente MÃ©dio
  "South Korea":"Coreia do Sul","Korea Republic":"Coreia do Sul",
  "Japan":"JapÃ£o","Iran":"IrÃ£","Iraq":"Iraque","Saudi Arabia":"ArÃ¡bia Saudita",
  "Jordan":"JordÃ¢nia","Uzbekistan":"UzbequistÃ£o","Qatar":"Catar",
  "Australia":"AustrÃ¡lia","Turkey":"Turquia","Turkiye":"Turquia",
  // AmÃ©rica do Sul
  "Brazil":"Brasil","Argentina":"Argentina","Uruguay":"Uruguai","Colombia":"ColÃ´mbia",
  "Paraguay":"Paraguai","Ecuador":"Equador","Chile":"Chile","Peru":"Peru","Bolivia":"BolÃ­via",
  // Outros
  "Curacao":"CuraÃ§ao","CuraÃ§ao":"CuraÃ§ao","Panama":"PanamÃ¡"
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
    return res.status(500).json({ error: "FOOTBALL_API_KEY nÃ£o configurada", hint: "Configure em Vercel â†’ Settings â†’ Environment Variables" });
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

    // ClassificaÃ§Ã£o por grupo
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

    // Cache conservador: 45s no edge pra nÃ£o perder gols
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
