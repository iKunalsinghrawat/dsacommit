import "server-only";

import { startOfDay, subDays } from "date-fns";

import { SubmissionState } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  calculateCommitmentScore,
  calculateConsistencyScore,
  calculateCurrentAndBestStreak,
} from "@/lib/scoring";

export async function refreshStudentProfile(userId: string) {
  const studentProfile = await prisma.studentProfile.findUnique({ where: { userId } });

  if (!studentProfile) {
    return;
  }

  const [checkins, bookmarksCount, revisionCount, submissions, allTopics, badges, publicPostCount] =
    await Promise.all([
      prisma.dailyCheckin.findMany({ where: { userId }, orderBy: { date: "asc" } }),
      prisma.bookmark.count({ where: { userId } }),
      prisma.revisionQueue.count({ where: { userId } }),
      prisma.submissionStatus.findMany({
        where: { userId },
        include: {
          problem: true,
        },
      }),
      prisma.topic.findMany({
        include: {
          problems: { select: { id: true } },
        },
      }),
      prisma.badge.findMany(),
      prisma.commitmentPost.count({ where: { userId, isPublic: true } }),
    ]);

  const checkinDates = checkins.map((checkin) => checkin.date);
  const streak = calculateCurrentAndBestStreak(checkinDates);
  const weeklyConsistencyScore = calculateConsistencyScore(
    checkins.filter((checkin) => checkin.date >= subDays(startOfDay(new Date()), 6)).length,
    7,
  );
  const monthlyCommitmentScore = calculateConsistencyScore(
    checkins.filter((checkin) => checkin.date >= subDays(startOfDay(new Date()), 29)).length,
    30,
  );
  const solvedProblems = submissions.filter((submission) => submission.status === SubmissionState.SOLVED);

  await prisma.streak.upsert({
    where: { userId },
    create: {
      userId,
      currentStreak: streak.currentStreak,
      bestStreak: streak.bestStreak,
      totalCheckins: checkins.length,
      lastCheckinDate: streak.lastCheckinDate,
    },
    update: {
      currentStreak: streak.currentStreak,
      bestStreak: streak.bestStreak,
      totalCheckins: checkins.length,
      lastCheckinDate: streak.lastCheckinDate,
    },
  });

  for (const topic of allTopics) {
    const solvedForTopic = solvedProblems.filter((submission) => submission.problem.topicId === topic.id).length;
    const totalProblemsSnapshot = topic.problems.length;
    const completionPercentage =
      totalProblemsSnapshot === 0 ? 0 : (solvedForTopic / totalProblemsSnapshot) * 100;

    await prisma.progress.upsert({
      where: {
        userId_topicId: {
          userId,
          topicId: topic.id,
        },
      },
      create: {
        userId,
        topicId: topic.id,
        solvedProblemsCount: solvedForTopic,
        totalProblemsSnapshot,
        completionPercentage,
        confidenceScore: Math.round(Math.min(100, completionPercentage + (solvedForTopic > 0 ? 8 : 0))),
        lastPracticedAt: solvedForTopic > 0 ? new Date() : null,
        note: solvedForTopic > 0 ? "Progress refreshed after new problem activity." : "Topic not started yet.",
      },
      update: {
        solvedProblemsCount: solvedForTopic,
        totalProblemsSnapshot,
        completionPercentage,
        confidenceScore: Math.round(Math.min(100, completionPercentage + (solvedForTopic > 0 ? 8 : 0))),
        lastPracticedAt: solvedForTopic > 0 ? new Date() : null,
        note: solvedForTopic > 0 ? "Progress refreshed after new problem activity." : "Topic not started yet.",
      },
    });
  }

  const commitmentScore = calculateCommitmentScore({
    weeklyConsistencyScore,
    monthlyCommitmentScore,
    solvedProblemsCount: solvedProblems.length,
    currentStreak: streak.currentStreak,
  });

  await prisma.studentProfile.update({
    where: { userId },
    data: {
      weeklyConsistencyScore: Math.round(weeklyConsistencyScore),
      monthlyCommitmentScore: Math.round(monthlyCommitmentScore),
      commitmentScore: Math.round(commitmentScore),
      questionsSolvedCount: solvedProblems.length,
      bookmarkedCount: bookmarksCount,
      revisionCount,
      challengePoints: Math.round((weeklyConsistencyScore + monthlyCommitmentScore) / 4),
    },
  });

  const badgeBySlug = new Map(badges.map((badge) => [badge.slug, badge.id]));
  await prisma.userBadge.createMany({
    data: [
      ...(checkins.length > 0 ? [{ userId, badgeId: badgeBySlug.get("first-checkin")! }] : []),
      ...(streak.bestStreak >= 7 ? [{ userId, badgeId: badgeBySlug.get("7-day-challenger")! }] : []),
      ...(monthlyCommitmentScore >= 80
        ? [{ userId, badgeId: badgeBySlug.get("consistency-engine")! }]
        : []),
      ...(solvedProblems.length >= 16 ? [{ userId, badgeId: badgeBySlug.get("topic-closer")! }] : []),
      ...(solvedProblems.length >= 12 ? [{ userId, badgeId: badgeBySlug.get("company-sprint")! }] : []),
      ...(publicPostCount >= 10 ? [{ userId, badgeId: badgeBySlug.get("wall-of-commitment")! }] : []),
    ],
    skipDuplicates: true,
  });
}
