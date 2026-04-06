import { describe, expect, it } from "vitest";

import {
  calculateCommitmentScore,
  calculateConsistencyScore,
  calculateCurrentAndBestStreak,
} from "@/lib/scoring";

describe("scoring helpers", () => {
  it("calculates bounded consistency scores", () => {
    expect(calculateConsistencyScore(5, 7)).toBeCloseTo(71.42, 0);
    expect(calculateConsistencyScore(0, 7)).toBe(0);
  });

  it("weights commitment score inputs without exceeding 100", () => {
    expect(
      calculateCommitmentScore({
        weeklyConsistencyScore: 92,
        monthlyCommitmentScore: 84,
        solvedProblemsCount: 18,
        currentStreak: 11,
      }),
    ).toBe(100);
  });

  it("derives current and best streak from ordered check-in dates", () => {
    const dates = [
      new Date("2026-03-29"),
      new Date("2026-03-30"),
      new Date("2026-03-31"),
      new Date("2026-04-02"),
      new Date("2026-04-03"),
      new Date("2026-04-04"),
    ];

    expect(calculateCurrentAndBestStreak(dates)).toMatchObject({
      currentStreak: 3,
      bestStreak: 3,
    });
  });
});
