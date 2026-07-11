export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });
  if (!process.env.OPENAI_API_KEY) return response.status(503).json({ error: 'OPENAI_API_KEY is not configured' });
  const { action = 'evaluate', topicZh = '', topicFr = '', questions = [], conversation = [] } = request.body || {};
  const prompt = action === 'translate'
    ? `请把下面的TCF Canada口语题目准确、自然地翻译成简体中文。只输出中文译文，不要解释。\n\n${topicFr}`
    : `你是TCF Canada口语Tâche 2法语考官。请用中文反馈，并保留法语修改。审核考生准备的完整对话，而不只是问句：检查是否切题、语法是否正确、开场和礼貌表达、解释和回应、过渡与追问是否自然，是否像真人交流而非连续审问。逐句给出更地道的法语改写，最后给出100分总分、问题覆盖度、互动自然度和缺失角度。\n中文题意：${topicZh}\n法语原题：${topicFr}\n完整对话：\n${(conversation.length?conversation:questions).map((line,i)=>`${i+1}. ${line}`).join('\n')}`;
  const apiResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-5.4-mini', input: prompt })
  });
  const data = await apiResponse.json();
  if (!apiResponse.ok) return response.status(apiResponse.status).json({ error: data.error?.message || 'OpenAI request failed' });
  const result = (data.output || []).flatMap(item => item.content || []).filter(item => item.type === 'output_text').map(item => item.text).join('\n');
  return response.status(200).json({ result });
}
