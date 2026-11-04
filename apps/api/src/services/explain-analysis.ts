import { z } from 'zod';

export const explainAnalysisSchema = z.object({
  points: z.array(z.object({
    keyPointId: z.number().int().positive(),
    status: z.enum(['covered', 'partial', 'incorrect', 'missing']),
    evidence: z.string().max(500),
    feedback: z.string().max(1000),
  }).strict()).min(1).max(30),
  summary: z.string().max(1000),
  nextFocus: z.array(z.number().int().positive()).max(2),
}).strict();

export type ExplainAnalysis = z.infer<typeof explainAnalysisSchema>;
export type ExplainKeyPoint = { id: number; text: string };

export interface ExplainAnalysisInput {
  topicTitle: string;
  notes: string;
  keyPoints: ExplainKeyPoint[];
  transcript: string;
}

export function calculateExplainScore(points: ExplainAnalysis['points']): number {
  if (points.length === 0) return 0;
  const earned = points.reduce((score, point) => {
    if (point.status === 'covered') return score + 1;
    if (point.status === 'partial') return score + 0.5;
    return score;
  }, 0);
  return Math.round((earned / points.length) * 100);
}

const ignoredWords = new Set([
  'about', 'after', 'also', 'because', 'been', 'being', 'between', 'from', 'have',
  'into', 'more', 'most', 'other', 'over', 'same', 'some', 'than', 'that', 'their',
  'there', 'these', 'they', 'this', 'those', 'through', 'under', 'using', 'very',
  'what', 'when', 'where', 'which', 'while', 'with', 'would', 'your',
]);

function keywords(value: string): Set<string> {
  return new Set(
    value.toLocaleLowerCase().match(/[\p{L}\p{N}]{3,}/gu)?.filter((word) => !ignoredWords.has(word)) ?? [],
  );
}

function evidenceForPoint(transcript: string, terms: ReadonlySet<string>): string {
  const sentences = transcript.split(/(?<=[.!?])\s+/);
  return sentences.find((sentence) => [...keywords(sentence)].some((word) => terms.has(word)))?.slice(0, 500) ?? '';
}

export function keywordExplain(input: ExplainAnalysisInput): ExplainAnalysis {
  const transcriptTerms = keywords(input.transcript);
  const points = input.keyPoints.map((keyPoint) => {
    const terms = keywords(keyPoint.text);
    const matches = [...terms].filter((word) => transcriptTerms.has(word));
    const ratio = terms.size === 0 ? 0 : matches.length / terms.size;
    const status: ExplainAnalysis['points'][number]['status'] =
      ratio >= 0.6 ? 'covered' : ratio >= 0.25 ? 'partial' : 'missing';
    const evidence = evidenceForPoint(input.transcript, new Set(matches));
    const feedback = status === 'covered'
      ? 'You included the main ideas from this point.'
      : status === 'partial'
        ? 'You mentioned part of this idea; add the remaining detail.'
        : 'This idea was not clear in the explanation. Try explaining it in your own words.';

    return { keyPointId: keyPoint.id, status, evidence, feedback };
  });
  const covered = points.filter((point) => point.status === 'covered').length;
  const nextFocus = points
    .filter((point) => point.status === 'missing' || point.status === 'partial')
    .slice(0, 2)
    .map((point) => point.keyPointId);

  return {
    points,
    summary: `${covered} of ${points.length} key points were clearly covered. This is a keyword-based estimate; review the transcript and gap feedback.`,
    nextFocus,
  };
}

export function validateAnalysisForKeyPoints(
  analysis: ExplainAnalysis,
  keyPoints: ReadonlyArray<ExplainKeyPoint>,
): ExplainAnalysis {
  const expected = new Set(keyPoints.map((point) => point.id));
  const actual = new Set(analysis.points.map((point) => point.keyPointId));
  if (
    analysis.points.length !== expected.size
    || actual.size !== expected.size
    || [...expected].some((id) => !actual.has(id))
    || analysis.nextFocus.some((id) => !expected.has(id))
  ) {
    throw new Error('Explain analysis did not match the topic key points.');
  }
  return analysis;
}
