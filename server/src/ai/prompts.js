export function extractionPrompt() {
  return `Read the supplied study material and return JSON only with this exact shape:
{"title":"short topic title","notes":"concise study summary","keyPoints":[{"id":1,"text":"one clear idea"}]}
Include 5 to 8 important, factual key points. Assign stable numeric ids 1 through 8. Do not invent facts not present in the material.`;
}

export function explanationPrompt(topic, transcript) {
  const points = topic.keyPoints.map((point) => ({ id: Number(point.id), text: point.text }));
  return `Compare the student's explanation with ONLY the supplied study notes and key points. The transcript may contain speech-recognition errors. Judge meaning rather than exact keywords. Return JSON only in this shape:
{"summary":"one-line supportive summary","points":[{"id":1,"status":"covered|partial|incorrect|missing","evidence":"short exact quote from transcript or empty string","feedback":"one helpful sentence"}],"next_focus":[1,2]}
Return exactly one point result for each supplied key point. Use only its existing numeric id. next_focus should contain up to two ids for the most important gaps.
NOTES: ${topic.notes}
KEY POINTS: ${JSON.stringify(points)}
TRANSCRIPT: ${transcript}`;
}