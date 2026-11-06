import { z } from 'zod';
import { prisma } from '../services/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';
import { analyzeExplanation, transcribeAudio } from '../ai/gemini.js';
import { explanationPrompt } from '../ai/prompts.js';
import { fallbackAnalysis } from '../ai/keywordFallback.js';
import { calculateScore } from '../services/scoring.js';

export async function explainTopic(req, res) {
  const topicId = Number(req.params.id);
  if (!Number.isSafeInteger(topicId) || topicId < 1) throw new HttpError(400, 'Topic ID must be a positive integer.');
  const data = z.object({
    transcript: z.string().trim().min(1).max(20_000),
    duration_sec: z.number().int().min(1).max(300).default(60),
  }).strict().parse(req.body);
  const wordCount = data.transcript.split(/\s+/).filter(Boolean).length;
  if (wordCount < 15) throw new HttpError(400, 'Please explain a little more before checking your understanding (at least 15 words).');

  const topic = await prisma.topic.findFirst({ where: { id: topicId, userId: req.user.id } });
  if (!topic) throw new HttpError(404, 'Topic not found.');
  const keyPoints = Array.isArray(topic.keyPoints) ? topic.keyPoints : [];
  if (!keyPoints.length) throw new HttpError(400, 'Add key points to this topic before explaining it.');

  let analysis;
  let usedFallback = false;
  try {
    analysis = await analyzeExplanation(explanationPrompt({ ...topic, keyPoints }, data.transcript));
    const byId = new Map(analysis.points.map((point) => [Number(point.id), point]));
    analysis.points = keyPoints.map((point) => byId.get(Number(point.id)) ?? ({
      id: Number(point.id),
      status: 'missing',
      evidence: '',
      feedback: 'This idea was not identified in your explanation.',
    }));
    const knownIds = new Set(keyPoints.map((point) => Number(point.id)));
    analysis.next_focus = analysis.next_focus.filter((id) => knownIds.has(Number(id))).slice(0, 2);
  } catch (error) {
    console.warn('Using keyword explanation fallback:', error.message);
    analysis = fallbackAnalysis(keyPoints, data.transcript);
    usedFallback = true;
  }

  const score = calculateScore(analysis.points);
  const explanation = await prisma.explanation.create({
    data: {
      topicId,
      transcript: data.transcript,
      durationSec: data.duration_sec,
      score,
      points: analysis.points,
      summary: analysis.summary,
      nextFocus: analysis.next_focus,
    },
  });
  await prisma.topic.update({ where: { id: topicId }, data: { mastery: score } });
  res.json({
    id: explanation.id,
    score,
    summary: analysis.summary,
    points: analysis.points,
    next_focus: analysis.next_focus,
    used_fallback: usedFallback,
    createdAt: explanation.createdAt,
  });
}

export async function transcribeAudioHandler(req, res) {
  if (!req.file?.buffer && !req.body?.audio) {
    throw new HttpError(400, 'Audio data is required.');
  }
  let buffer;
  let mimetype = 'audio/webm';
  if (req.file?.buffer) {
    buffer = req.file.buffer;
    mimetype = req.file.mimetype || mimetype;
  } else if (req.body?.audio) {
    const match = req.body.audio.match(/^data:([^;,]+)/);
    if (match?.[1]) mimetype = match[1];
    else if (req.body.mimetype) mimetype = req.body.mimetype.split(';')[0];
    const raw = req.body.audio.replace(/^data:[^,]+,/, '');
    buffer = Buffer.from(raw, 'base64');
  }
  try {
    const transcript = await transcribeAudio(buffer, mimetype);
    res.json({ transcript });
  } catch (error) {
    console.error('Audio transcription failed:', error);
    throw new HttpError(500, 'Could not transcribe audio. Check server Gemini configuration.');
  }
}
