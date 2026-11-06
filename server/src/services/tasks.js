export function calculateRecallStreak(rounds, now = new Date()) {
  const activeDays = new Set(
    rounds
      .filter((round) => round.finishedAt)
      .map((round) => new Date(round.finishedAt).toISOString().slice(0, 10)),
  );
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  let current = activeDays.has(today.toISOString().slice(0, 10)) ? today
    : activeDays.has(yesterday.toISOString().slice(0, 10)) ? yesterday
      : null;
  let streak = 0;
  while (current && activeDays.has(current.toISOString().slice(0, 10))) {
    streak += 1;
    current.setUTCDate(current.getUTCDate() - 1);
  }
  return streak;
}

export function buildTopicTasks(topics, recallRounds, passMark) {
  return topics.map((topic) => {
    const explain = topic.explanations?.[0];
    const pinDone = topic.flags?.length > 0;
    let recallDone = false;
    const relevantRound = recallRounds.find((round) =>
      round.results.some((result) => result.flag.topicId === topic.id));
    if (relevantRound) {
      const results = relevantRound.results.filter((result) => result.flag.topicId === topic.id);
      recallDone = results.length > 0 && results.filter((result) => result.result === 'green').length > results.length / 2;
    }

    return {
      topicId: topic.id,
      title: topic.title,
      tasks: [
        { id: 'material', title: 'Add material', done: topic.topicFiles?.length > 0 },
        { id: 'explain', title: 'Explain it', done: Boolean(explain && explain.score >= passMark) },
        { id: 'pin', title: 'Pin it', done: pinDone },
        { id: 'recall', title: 'Recall it', done: recallDone },
      ],
    };
  });
}