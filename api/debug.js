// api/debug.js — endpoint de diagnóstico (pode apagar depois da Copa)
// Acesse: https://seu-projeto.vercel.app/api/debug

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const key = process.env.FOOTBALL_API_KEY;
  if (!key) {
    return res.status(200).json({
      ok: false,
      problema: "FOOTBALL_API_KEY não encontrada",
      solucao: "Vercel → seu projeto → Settings → Environment Variables → adicione FOOTBALL_API_KEY"
    });
  }

  const headers = { "x-apisports-key": key };
  const base = "https://v3.football.api-sports.io";

  try {
    // Checa cota restante
    const statusRes = await fetch(`${base}/status`, { headers });
    const statusData = await statusRes.json();
    const sub = statusData.response?.subscription;
    const req_info = statusData.response?.requests;

    // Pega jogos ao vivo
    const liveRes = await fetch(`${base}/fixtures?league=1&season=2026&live=all`, { headers });
    const liveData = await liveRes.json();
    const live = (liveData.response || []).map(f => ({
      home: f.teams.home.name,
      away: f.teams.away.name,
      score: `${f.goals.home} x ${f.goals.away}`,
      status: f.fixture.status.short,
      minute: f.fixture.status.elapsed
    }));

    // Pega jogos de hoje
    const today = new Date().toISOString().slice(0, 10);
    const todayRes = await fetch(`${base}/fixtures?league=1&season=2026&date=${today}`, { headers });
    const todayData = await todayRes.json();
    const todayGames = (todayData.response || []).map(f => ({
      home: f.teams.home.name,
      away: f.teams.away.name,
      score: `${f.goals.home ?? '-'} x ${f.goals.away ?? '-'}`,
      status: f.fixture.status.short,
      time: f.fixture.date
    }));

    return res.status(200).json({
      ok: true,
      timestamp: new Date().toISOString(),
      api_key_presente: true,
      plano: sub?.plan,
      requisicoes_hoje: req_info?.current,
      limite_diario: req_info?.limit_day,
      jogos_ao_vivo: live.length,
      jogos_ao_vivo_detalhes: live,
      jogos_hoje: todayGames.length,
      jogos_hoje_detalhes: todayGames,
      live_raw_errors: liveData.errors,
      live_results: liveData.results,
      today_raw_errors: todayData.errors,
      today_results: todayData.results
    });

  } catch (err) {
    return res.status(500).json({ ok: false, erro: err.message });
  }
};
