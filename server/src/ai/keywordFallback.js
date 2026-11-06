const stopWords = new Set([
  'about', 'after', 'again', 'also', 'among', 'because', 'before', 'being', 'between',
  'could', 'does', 'from', 'have', 'into', 'more', 'most', 'other', 'over', 'same',
  'some', 'such', 'than', 'that', 'their', 'them', 'then', 'there', 'these', 'they',
  'this', 'those', 'through', 'under', 'very', 'were', 'what', 'when', 'where', 'which',
  'while', 'with', 'would', 'your', 'explain', 'point', 'topic',
]);

function tokens(value) {
  return new Set((value.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []).filter((word) => !stopWords.has(word)));
}

function overlap(a, b) {
  const left = tokens(a);
  const right = tokens(b);
  if (!left.size || !right.size) return 0;
  let common = 0;
  for (const word of left) if (right.has(word)) common += 1;
  return common / Math.sqrt(left.size * right.size);
}

export function fallbackAnalysis(keyPoints, transcript) {
  const pieces = transcript.split(/(?<=[.!?])\s+|\n+/).filter(Boolean);
  const points = keyPoints.map((point) => {
    let best = { score: 0, phrase: '' };
    for (const phrase of pieces) {
      const score = overlap(point.text, phrase);
      if (score > best.score) best = { score, phrase };
    }
    const status = best.score >= 0.58 ? 'covered' : best.score >= 0.3 ? 'partial' : 'missing';
    return {
      id: Number(point.id),
      status,
      evidence: best.score >= 0.3 ? best.phrase.slice(0, 500) : '',
      feedback: status === 'covered'
        ? 'Your explanation appears to include this idea.'
        : status === 'partial'
          ? 'You mentioned some related terms; explain the relationship more clearly.'
          : 'This idea was not clearly identified in your explanation.',
    };
  });
  const gaps = points.filter((point) => point.status !== 'covered');
  return {
    summary: 'This gap check used a keyword-based fallback because the AI service was unavailable. Review the feedback and key points.',
    points,
    next_focus: gaps.slice(0, 2).map((point) => point.id),
  };
}