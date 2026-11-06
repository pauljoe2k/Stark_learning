const dayMilliseconds = 24 * 60 * 60 * 1000;

export function parseExamDate(value) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    if (localDate.getFullYear() !== year || localDate.getMonth() !== month - 1 || localDate.getDate() !== day) return null;
    return localDate;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function groupExamsByLocalDate(exams) {
  return exams.reduce((groups, exam) => {
    const date = parseExamDate(exam.examDate ?? exam.date);
    if (!date) return groups;
    const key = localDateKey(date);
    groups.set(key, [...(groups.get(key) ?? []), exam]);
    return groups;
  }, new Map());
}

export function daysUntilExam(date, now = new Date()) {
  const examDay = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((examDay - today) / dayMilliseconds);
}

export function examTimeLabel(value) {
  const date = parseExamDate(value);
  if (!date || (date.getHours() === 0 && date.getMinutes() === 0)) return 'Time not set';
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
}

export function examSubject(exam) {
  return exam.subject || exam.unit?.title || 'General';
}
