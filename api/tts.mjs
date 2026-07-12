export default async function handler(request, response) {
  const allowedOrigins = new Set(['https://ella230221.github.io','http://localhost:3000','http://127.0.0.1:3000']);
  const origin = request.headers.origin;
  if (allowedOrigins.has(origin)) response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Vary','Origin');
  response.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers','Content-Type');
  if (request.method === 'OPTIONS') return response.status(204).end();
  if (request.method !== 'POST') return response.status(405).json({error:'Méthode non autorisée'});
  if (!process.env.OPENAI_API_KEY) return response.status(503).json({error:'OPENAI_API_KEY n’est pas configurée sur le serveur'});
  const {text='',voice='marin',speed=1}=request.body||{};
  if (!text.trim() || text.length > 4096) return response.status(400).json({error:'Le texte doit contenir entre 1 et 4 096 caractères'});
  const safeVoice=['marin','cedar','coral'].includes(voice)?voice:'marin';
  const safeSpeed=Math.min(1.25,Math.max(.65,Number(speed)||1));
  const apiResponse=await fetch('https://api.openai.com/v1/audio/speech',{
    method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify({model:'gpt-4o-mini-tts',voice:safeVoice,input:text,speed:safeSpeed,response_format:'mp3',instructions:'Parlez en français standard naturel, comme une vraie personne qui se présente à un examinateur. Articulation claire sans exagération, intonation chaleureuse et spontanée, rythme fluide, pauses naturelles à la ponctuation, sans ton publicitaire ni voix robotique.'})
  });
  if(!apiResponse.ok){const data=await apiResponse.json().catch(()=>({}));return response.status(apiResponse.status).json({error:data.error?.message||'Échec de la génération vocale'});}
  const audio=Buffer.from(await apiResponse.arrayBuffer());
  response.setHeader('Content-Type','audio/mpeg');response.setHeader('Cache-Control','private, max-age=86400');
  return response.status(200).send(audio);
}
