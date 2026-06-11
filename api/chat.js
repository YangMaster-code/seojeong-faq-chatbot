module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });

  const { userMsg, context, langInstruction } = req.body;
  if (!userMsg || !context) return res.status(400).json({ error: '잘못된 요청입니다.' });

  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'API 키가 설정되지 않았습니다.' });

  const systemPrompt = `당신은 서정대학교 학생 민원 FAQ 챗봇입니다. 아래 FAQ 데이터를 기반으로 학생의 질문에 친절하고 정확하게 답변하세요.

${langInstruction || '한국어로 답변해 주세요.'}

FAQ 데이터:
${context.map(f => `[${f.cat} > ${f.sub}]\n질문: ${f.q}\n답변: ${f.a}\n문의처: 📞 ${f.contact}`).join('\n\n---\n\n')}

답변 규칙:
1. FAQ 데이터에 있는 정보만 사용하세요.
2. 관련 FAQ가 없으면 학생성공처(031-860-5013~5015)에 문의하도록 안내하세요.
3. 단계적 절차는 번호를 붙여 명확하게 작성하세요.
4. 반드시 문의처(📞 전화번호)를 포함하세요.
5. 이모지를 적절히 사용하여 가독성을 높이세요.
6. 위에서 지정한 언어로 반드시 답변하세요.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-8',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMsg }],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const answer = data.content?.map(b => b.text || '').join('') || '답변을 가져오지 못했습니다.';
    return res.status(200).json({ answer });
  } catch (err) {
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};
