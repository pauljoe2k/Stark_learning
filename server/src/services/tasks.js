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