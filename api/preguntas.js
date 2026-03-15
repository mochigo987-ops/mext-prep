export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { subject, mode, difficulty } = req.body;

  const mathTopics = {
    basic: 'algebra (linear equations, basic operations, fractions), basic functions (linear, quadratic), basic geometry (area, perimeter, angles), basic statistics (mean, median, mode)',
    inter: 'quadratic equations, polynomial functions, trigonometry basics, coordinate geometry, probability, sequences and series',
    adv: 'advanced functions, vectors, combinatorics, logarithms, progressions, statistical distributions, complex geometry'
  };
  const engTopics = {
    basic: '12 verb tenses, basic grammar, B1 vocabulary, simple sentence correction',
    inter: 'B2 grammar, phrasal verbs, academic vocabulary, reading comprehension with short texts, sentence transformation',
    adv: 'C1 vocabulary, academic reading passages, complex grammar structures, error correction, inferential comprehension'
  };

  const count = mode === 'sim' ? 10 : 5;
  const topics = subject === 'math' ? mathTopics[difficulty] : engTopics[difficulty];
  const subjectDesc = subject === 'math'
    ? 'MEXT Japanese university entrance exam mathematics'
    : 'MEXT Japanese university entrance exam English';
  const faseLabel = { basic: 'Fase 1 (Fundamentos)', inter: 'Fase 2 (Consolidación)', adv: 'Fase 3 (Preparación Final)' }[difficulty];
  const isFill = mode === 'fill';

  const prompt = `You are generating practice questions for Colombian students preparing for the MEXT Japan scholarship exam.
Generate exactly ${count} ${subjectDesc} questions at ${faseLabel} level covering: ${topics}.

${isFill
    ? 'Format: fill-in-the-blank. Each sentence has exactly ONE blank marked as ___. The blank_answer must be a single word or number (no spaces).'
    : 'Format: multiple choice with exactly 4 options labeled A, B, C, D. The "correct" field is the letter of the correct answer.'}

Respond ONLY with a valid JSON array. No markdown, no backticks, no text before or after.
Each element:
{"id":1,"question":"...","topic":"short topic name",${isFill
    ? '"blank_answer":"...","hint":"optional short hint",'
    : '"options":{"A":"...","B":"...","C":"...","D":"..."},"correct":"A",'}
"explanation":"1-2 sentences","context":"empty string or short passage for reading questions"}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const text = (data.content || []).map(i => i.text || '').join('');
    const start = text.indexOf('['), end = text.lastIndexOf(']');
    if (start === -1 || end === -1) return res.status(500).json({ error: 'Respuesta inválida de la IA' });

    const questions = JSON.parse(text.slice(start, end + 1));
    return res.status(200).json({ questions });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
