import { clamp } from "@/lib/utils";

export function calculateConsistencyScore(checkins: number, totalDays: number) {
  if (totalDays <= 0) {
    return 0;
  }

  return clamp((checkins / totalDays) * 100);
}

export function calculateCommitmentScore(input: {
  weeklyConsistencyScore: number;
  monthlyCommitmentScore: number;
  solvedProblemsCount: number;
  currentStreak: number;
}) {
  const solvedBoost = Math.min(20, input.solvedProblemsCount);
  const streakBoost = Math.min(15, input.currentStreak * 1.5);

  return clamp(
    input.weeklyConsistencyScore * 0.4 +
      input.monthlyCommitmentScore * 0.4 +
      solvedBoost +
      streakBoost,
  );
}

export function calculateCurrentAndBestStreak(checkinDates: Date[]) {
  if (checkinDates.length === 0) {
    return { currentStreak: 0, bestStreak: 0, lastCheckinDate: null as Date | null };
  }

  const normalized = [...checkinDates]
    .map((date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()))
    .sort((a, b) => a.getTime() - b.getTime());

  let bestStreak = 1;
  let running = 1;

  for (let index = 1; index < normalized.length; index += 1) {
    const diff =
      (normalized[index].getTime() - normalized[index - 1].getTime()) /
      (1000 * 60 * 60 * 24);

    if (diff === 1) {
      running += 1;
      bestStreak = Math.max(bestStreak, running);
    } else if (diff > 1) {
      running = 1;
    }
  }

  const latest = normalized[normalized.length - 1];
  let currentStreak = 1;

  for (let index = normalized.length - 1; index > 0; index -= 1) {
    const diff =
      (normalized[index].getTime() - normalized[index - 1].getTime()) /
      (1000 * 60 * 60 * 24);

    if (diff === 1) {
      currentStreak += 1;
      continue;
    }

    break;
  }

  return { currentStreak, bestStreak, lastCheckinDate: latest };
}
