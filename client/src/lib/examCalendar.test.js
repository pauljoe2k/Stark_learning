import test from 'node:test';
import assert from 'node:assert/strict';
import { daysUntilExam, examSubject, examTimeLabel, groupExamsByLocalDate, localDateKey } from './examCalendar.js';

test('calendar groups exams by local date and preserves multiple exams on a day', () => {
  const date = new Date(2026, 2, 14, 9);
  const key = localDateKey(date);
  const grouped = groupExamsByLocalDate([
    { id: 1, examDate: date.toISOString() },
    { id: 2, date: new Date(2026, 2, 14, 14).toISOString() },
    { id: 4, date: '2026-03-14' },
    { id: 3, examDate: 'invalid' },
  ]);
  assert.deepEqual(grouped.get(key).map((exam) => exam.id), [1, 2, 4]);
});

test('calendar countdown uses calendar days, and absent times remain explicit', () => {
  const today = new Date(2026, 2, 14, 18);
  assert.equal(daysUntilExam(new Date(2026, 2, 20, 9), today), 6);
  assert.equal(examTimeLabel(new Date(2026, 2, 14).toISOString()), 'Time not set');
  assert.equal(examSubject({ unit: { title: 'Physics' } }), 'Physics');
});
