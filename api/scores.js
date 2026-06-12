const NAME_MAP={"Mexico":"México","Canada":"Canadá","United States":"EUA","USA":"EUA","South Africa":"África do Sul","South Korea":"Coreia do Sul","Korea Republic":"Coreia do Sul","Czech Republic":"Rep. Tcheca","Czechia":"Rep. Tcheca","Bosnia And Herzegovina":"Bósnia","Bosnia and Herzegovina":"Bósnia","Brazil":"Brasil","Morocco":"Marrocos","Egypt":"Egito","Ghana":"Gana","Ivory Coast":"Costa do Marfim","Cote D'Ivoire":"Costa do Marfim","Côte d'Ivoire":"Costa do Marfim","Tunisia":"Tunísia","Algeria":"Argélia","Cape Verde":"Cabo Verde","DR Congo":"RD Congo","New Zealand":"Nova Zelândia","England":"Inglaterra","France":"França","Spain":"Espanha","Germany":"Alemanha","Netherlands":"Países Baixos","Belgium":"Bélgica","Croatia":"Croácia","Norway":"Noruega","Switzerland":"Suíça","Sweden":"Suécia","Scotland":"Escócia","Austria":"Áustria","Japan":"Japão","Iran":"Irã","Iraq":"Iraque","Saudi Arabia":"Arábia Saudita","Jordan":"Jordânia","Uzbekistan":"Uzbequistão","Qatar":"Catar","Australia":"Austrália","Turkey":"Turquia","Turkiye":"Turquia","Paraguay":"Paraguai","Ecuador":"Equador","Colombia":"Colômbia","Uruguay":"Uruguai","Curacao":"Curaçao","Panama":"Panamá"};
function ptName(n){return NAME_MAP[n]||NAME_MAP[(n||"").trim()]||n;}

module.exports=async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  const key=process.env.FOOTBALL_API_KEY;
  if(!key) return res.status(500).json({error:"FOOTBALL_API_KEY não configurada"});
  const headers={"x-apisports-key":key};
  const base="https://v3.football.api-sports.io";
  try{
    const today=new Date().toISOString().slice(0,10);
    const [liveRes,todayRes,standRes]=await Promise.all([
      fetch(base+"/fixtures?league=1&season=2026&live=all",{headers}),
      fetch(base+"/fixtures?league=1&season=2026&date="+today,{headers}),
      fetch(base+"/standings?league=1&season=2026",{headers})
    ]);
    const liveData=await liveRes.json();
    const todayData=await todayRes.json();
    const standData=await standRes.json();
    const all=[...(liveData.response||[]),...(todayData.response||[])];
    const seen=new Set();
    const matches=all.filter(f=>{if(seen.has(f.fixture.id))return false;seen.add(f.fixture.id);return true;}).map(f=>({
      home:ptName(f.teams.home.name),away:ptName(f.teams.away.name),
      score_home:f.goals.home,score_away:f.goals.away,
      status:f.fixture.status.short,minute:f.fixture.status.elapsed
    }));
    const standings={};
    (standData.response?.[0]?.league?.standings||[]).forEach(g=>g.forEach(t=>{
      const gr=(t.group||"").replace("Group ","");
      if(!standings[gr])standings[gr]=[];
      standings[gr].push({team:ptName(t.team.name),rank:t.rank,pts:t.points,j:t.all.played,sg:t.all.goals.for-t.all.goals.against});
    }));
    res.setHeader("Cache-Control","s-maxage=45,stale-while-revalidate=60");
    res.status(200).json({updated:new Date().toISOString(),matches,standings});
  }catch(e){res.status(500).json({error:e.message});}
};
