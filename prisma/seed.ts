import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { faker } from "@faker-js/faker";
import { startOfDay, subDays } from "date-fns";

import { PrismaClient } from "../src/generated/prisma/client";
import {
  CareerTarget,
  CommunityPostType,
  ParticipationStatus,
  Role,
  StudentLevel,
  SubmissionState,
} from "../src/generated/prisma/enums";
import { problemSeed } from "../src/data/problem-bank";
import {
  badgeSeed,
  challengeSeed,
  companySeed,
  mentorPostSeed,
  mentorSeed,
  roadmapItemSeed,
  topicSeed,
} from "../src/data/platform-content";
import { problemChallengeSeed } from "../src/data/problem-challenges";
import { defaultCredentials } from "../src/lib/constants";
import { getDefaultAccessGrants } from "../src/lib/access-control";
import {
  calculateCommitmentScore,
  calculateConsistencyScore,
  calculateCurrentAndBestStreak,
} from "../src/lib/scoring";
import { hashPassword } from "../src/lib/password";
import { slugify } from "../src/lib/utils";

faker.seed(20260404);

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL!),
});

const studentNames = [
  "Riya Sharma",
  "Karthik Subramanian",
  "Zoya Khan",
  "Aditya Singh",
  "Neha Joshi",
  "Arjun Patel",
  "Sana Fatima",
  "Vivek Rao",
  "Kavya Iyer",
  "Rohit Chawla",
  "Ishaan Gupta",
  "Diya Sethi",
  "Manan Shah",
  "Aisha Noor",
  "Harsh Vardhan",
  "Mitali Jain",
  "Pranav Kulkarni",
  "Simran Kaur",
  "Yash Mehta",
  "Tanya Bose",
];

const cities = [
  "Bengaluru",
  "Hyderabad",
  "Pune",
  "Chennai",
  "Mumbai",
  "Delhi",
  "Noida",
  "Kolkata",
];

const languageCycle = ["C++", "Java", "Python", "JavaScript"];
const headlineCycle = [
  "Built momentum from zero after wasting months on random problem lists.",
  "Turned daily 90-minute sessions into a placement-ready routine.",
  "Now solving with a roadmap instead of panic before interviews.",
  "Using consistency and revision to close weak topics one by one.",
];

type SeedStudent = {
  id: string;
  name: string;
  email: string;
  level: StudentLevel;
  target: CareerTarget;
  preferredLanguage: string;
  dailyAvailableHours: number;
  targetCompanySlugs: string[];
  weakTopicSlugs: string[];
  solvedProblemSlugs: string[];
  attemptedProblemSlugs: string[];
  checkinDates: Date[];
  publicCommitmentPosts: number;
};

async function clearDatabase() {
  await prisma.changeRequestReview.deleteMany();
  await prisma.changeRequest.deleteMany();
  await prisma.postLike.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.communityPost.deleteMany();
  await prisma.commitmentPost.deleteMany();
  await prisma.challengeParticipation.deleteMany();
  await prisma.challenge.deleteMany();
  await prisma.userBadge.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.codeSubmission.deleteMany();
  await prisma.problemCompanyTag.deleteMany();
  await prisma.problemTestCase.deleteMany();
  await prisma.submissionStatus.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.revisionQueue.deleteMany();
  await prisma.progress.deleteMany();
  await prisma.dailyCheckin.deleteMany();
  await prisma.streak.deleteMany();
  await prisma.mentorFollower.deleteMany();
  await prisma.mentorQuestion.deleteMany();
  await prisma.mentorPost.deleteMany();
  await prisma.companyRole.deleteMany();
  await prisma.companyContent.deleteMany();
  await prisma.studentTargetCompany.deleteMany();
  await prisma.studentWeakTopic.deleteMany();
  await prisma.roadmapItem.deleteMany();
  await prisma.problem.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.mentorProfile.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.companyProfile.deleteMany();
  await prisma.user.deleteMany();
}

function pickProblemSlice(offset: number, count: number) {
  const rotated = [...problemSeed.slice(offset), ...problemSeed.slice(0, offset)];
  return rotated.slice(0, count).map((problem) => problem.slug);
}

function createCheckinDates(studentIndex: number) {
  const today = startOfDay(new Date());
  const dates: Date[] = [];

  for (let dayOffset = 34; dayOffset >= 0; dayOffset -= 1) {
    const date = subDays(today, dayOffset);
    const rule =
      studentIndex < 5
        ? (dayOffset + studentIndex) % 7 !== 1
        : studentIndex < 12
          ? (dayOffset + studentIndex) % 5 !== 0
          : (dayOffset + studentIndex) % 3 !== 0;

    if (rule) {
      dates.push(date);
    }
  }

  return dates;
}

function createStudentBlueprint(name: string, index: number): Omit<SeedStudent, "id"> {
  const level =
    index < 7
      ? StudentLevel.BEGINNER
      : index < 14
        ? StudentLevel.INTERMEDIATE
        : StudentLevel.ADVANCED;

  const target =
    index % 3 === 0
      ? CareerTarget.PLACEMENT
      : index % 3 === 1
        ? CareerTarget.INTERNSHIP
        : CareerTarget.SWITCH;

  const solvedCount =
    level === StudentLevel.BEGINNER
      ? 6 + (index % 3)
      : level === StudentLevel.INTERMEDIATE
        ? 11 + (index % 4)
        : 16 + (index % 5);

  const attemptedCount = solvedCount + 4;

  return {
    name,
    email: `student${String(index + 1).padStart(2, "0")}@dsacommit.dev`,
    level,
    target,
    preferredLanguage: languageCycle[index % languageCycle.length],
    dailyAvailableHours: 2 + (index % 4),
    targetCompanySlugs: [
      companySeed[index % companySeed.length].slug,
      companySeed[(index + 3) % companySeed.length].slug,
    ],
    weakTopicSlugs: [
      topicSeed[(index + 2) % topicSeed.length].slug,
      topicSeed[(index + 6) % topicSeed.length].slug,
    ],
    solvedProblemSlugs: pickProblemSlice(index, solvedCount),
    attemptedProblemSlugs: pickProblemSlice(index + 2, attemptedCount),
    checkinDates: createCheckinDates(index),
    publicCommitmentPosts: index < 5 ? 12 : index < 12 ? 7 : 4,
  };
}

async function createBaseUsersAndContent(defaultPasswordHash: string) {
  const adminUser = await prisma.user.create({
    data: {
      email: defaultCredentials.admin.email,
      passwordHash: await hashPassword(defaultCredentials.admin.password),
      name: "DSA Commit Admin",
      slug: "dsa-commit-admin",
      role: Role.ADMIN,
      accessGrants: getDefaultAccessGrants(Role.ADMIN),
      headline: "Keeps the roadmap, mentors, and community high-signal.",
      bio: "Platform admin account for moderation, featured content, and leaderboard curation.",
      isOnboarded: true,
      isVerified: true,
      isFeatured: true,
      location: "Remote",
    },
  });

  const badgeMap = new Map<string, string>();
  for (const badge of badgeSeed) {
    const created = await prisma.badge.create({ data: badge });
    badgeMap.set(badge.slug, created.id);
  }

  const topicMap = new Map<string, string>();
  for (const topic of topicSeed) {
    const created = await prisma.topic.create({
      data: {
        ...topic,
        quiz: topic.quiz,
      },
    });
    topicMap.set(topic.slug, created.id);
  }

  for (const roadmapItem of roadmapItemSeed) {
    await prisma.roadmapItem.create({
      data: {
        title: roadmapItem.title,
        slug: roadmapItem.slug,
        level: roadmapItem.level,
        summary: roadmapItem.summary,
        details: roadmapItem.details,
        sortOrder: roadmapItem.sortOrder,
        topicId: topicMap.get(roadmapItem.topicSlug),
      },
    });
  }

  const companyMap = new Map<string, string>();
  const companyOwnerMap = new Map<string, string>();

  for (const company of companySeed) {
    const owner = await prisma.user.create({
      data: {
        email: `${company.slug}@dsacommit.dev`,
        passwordHash: defaultPasswordHash,
        name: `${company.name} Hiring Team`,
        slug: `${company.slug}-hiring-team`,
        role: Role.COMPANY,
        accessGrants: getDefaultAccessGrants(Role.COMPANY),
        headline: `Official ${company.name} prep and hiring updates.`,
        bio: `Company portal owner account for ${company.name}.`,
        isOnboarded: true,
        isVerified: true,
        location: "India",
      },
    });

    const createdCompany = await prisma.companyProfile.create({
      data: {
        ownerId: owner.id,
        name: company.name,
        slug: company.slug,
        overview: company.overview,
        industry: company.industry,
        website: company.website,
        hiringFocusAreas: company.hiringFocusAreas,
        commonFocusTopics: company.commonFocusTopics,
        rolePreferences: company.rolePreferences,
        oaPattern: company.oaPattern,
        interviewRounds: company.interviewRounds,
        preparationTips: company.preparationTips,
        recommendedRoadmap: company.recommendedRoadmap,
        featured: company.featured,
        roles: {
          create: company.rolePreferences.slice(0, 2).map((rolePreference, index) => ({
            title: rolePreference,
            roleType: index === 0 ? "Campus" : "Lateral",
            focusAreas: company.hiringFocusAreas.slice(0, 3),
            location: index === 0 ? "India - Remote" : "Bengaluru - Hybrid",
          })),
        },
        contents: {
          create: [
            {
              title: `${company.name} interview focus for this quarter`,
              content: `Revise ${company.hiringFocusAreas.join(", ").toLowerCase()} and prioritize consistent medium-level problem solving before jumping into rare hard problems.`,
              category: "GUIDANCE",
            },
            {
              title: `${company.name} prep challenge week`,
              content: `A community event placeholder where the company can publish a sprint around ${company.commonFocusTopics.slice(0, 3).join(", ")}.`,
              category: "EVENT",
            },
          ],
        },
      },
    });

    companyMap.set(company.slug, createdCompany.id);
    companyOwnerMap.set(company.slug, owner.id);
  }

  const mentorMap = new Map<string, string>();

  for (const mentor of mentorSeed) {
    const user = await prisma.user.create({
      data: {
        email: mentor.email,
        passwordHash: defaultPasswordHash,
        name: mentor.name,
        slug: mentor.slug,
        role: Role.MENTOR,
        accessGrants: getDefaultAccessGrants(Role.MENTOR),
        headline: mentor.headline,
        bio: mentor.bio,
        isOnboarded: true,
        isVerified: true,
        isFeatured: mentor.featured,
        location: "Remote",
      },
    });

    await prisma.mentorProfile.create({
      data: {
        userId: user.id,
        companyId: companyMap.get(mentor.companySlug),
        roleTitle: mentor.roleTitle,
        experienceYears: mentor.experienceYears,
        bio: mentor.bio,
        expertiseTags: mentor.expertiseTags,
        verifiedBadge: true,
        featured: mentor.featured,
        officeHours: mentor.officeHours,
        recommendedSetTitle: mentor.recommendedSetTitle,
        recommendedSetSummary: mentor.recommendedSetSummary,
      },
    });

    mentorMap.set(mentor.slug, user.id);
  }

  for (const post of mentorPostSeed) {
    await prisma.mentorPost.create({
      data: {
        mentorId: mentorMap.get(post.mentorSlug)!,
        companyId: companyMap.get(
          mentorSeed.find((mentor) => mentor.slug === post.mentorSlug)!.companySlug,
        ),
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        tags: post.tags,
        recommendedProblemSlugs: post.recommendedProblemSlugs,
      },
    });
  }

  for (const problem of problemSeed) {
    const challenge = problemChallengeSeed[problem.slug];

    await prisma.problem.create({
      data: {
        title: problem.title,
        slug: problem.slug,
        difficulty: problem.difficulty,
        topicId: topicMap.get(problem.topicSlug)!,
        problemStatement: problem.problemStatement,
        examples: problem.examples,
        constraints: problem.constraints,
        hints: problem.hints,
        editorial: problem.editorial,
        similarProblemSlugs: problem.similarProblemSlugs,
        roleFocus: problem.roleFocus,
        frequency: problem.frequency,
        estimatedMinutes: problem.estimatedMinutes,
        isFeatured: problem.isFeatured ?? false,
        codeExecutionEnabled: Boolean(challenge),
        starterCode: challenge?.starterCode,
        starterLanguage: challenge?.starterLanguage ?? "TYPESCRIPT",
        companyTags: {
          create: problem.companyTags.map((companyTag) => ({
            companyId: companyMap.get(companyTag.companySlug)!,
            frequency: companyTag.frequency,
            role: companyTag.role,
            notes: companyTag.notes,
          })),
        },
        testCases: challenge
          ? {
              create: challenge.testCases.map((testCase) => ({
                label: testCase.label,
                input: testCase.input,
                expectedOutput: testCase.expectedOutput,
                isHidden: testCase.isHidden ?? false,
                sortOrder: testCase.sortOrder,
              })),
            }
          : undefined,
      },
    });
  }

  const today = startOfDay(new Date());
  for (const challenge of challengeSeed) {
    await prisma.challenge.create({
      data: {
        title: challenge.title,
        slug: challenge.slug,
        description: challenge.description,
        type: challenge.type,
        durationDays: challenge.durationDays,
        targetValue: challenge.targetValue,
        badgeId: badgeMap.get(challenge.badgeSlug),
        isFeatured: true,
        startDate: subDays(today, challenge.durationDays - 1),
        endDate: today,
      },
    });
  }

  return { adminUser, badgeMap, topicMap, companyMap, companyOwnerMap, mentorMap };
}

async function createStudents(
  defaultPasswordHash: string,
  companyMap: Map<string, string>,
  topicMap: Map<string, string>,
) {
  const students: SeedStudent[] = [];

  for (const [index, name] of studentNames.entries()) {
    const blueprint = createStudentBlueprint(name, index);
    const slug = slugify(name);

    const user = await prisma.user.create({
      data: {
        email: blueprint.email,
        passwordHash: defaultPasswordHash,
        name,
        slug,
        role: Role.STUDENT,
        accessGrants: getDefaultAccessGrants(Role.STUDENT),
        headline: headlineCycle[index % headlineCycle.length],
        bio: `${name.split(" ")[0]} is targeting ${blueprint.target.toLowerCase()} opportunities with a ${blueprint.level.toLowerCase()}-to-advanced DSA roadmap.`,
        location: cities[index % cities.length],
        isOnboarded: true,
        isFeatured: index < 3,
      },
    });

    await prisma.studentProfile.create({
      data: {
        userId: user.id,
        currentLevel: blueprint.level,
        target: blueprint.target,
        dailyAvailableHours: blueprint.dailyAvailableHours,
        preferredLanguage: blueprint.preferredLanguage,
        about: `Focused on turning ${blueprint.dailyAvailableHours} disciplined hours a day into interview confidence.`,
        targetCompanies: {
          create: blueprint.targetCompanySlugs.map((companySlug) => ({
            companyId: companyMap.get(companySlug)!,
          })),
        },
        weakTopics: {
          create: blueprint.weakTopicSlugs.map((topicSlug) => ({
            topicId: topicMap.get(topicSlug)!,
          })),
        },
      },
    });

    students.push({ id: user.id, ...blueprint });
  }

  return students;
}

async function createStudentActivity(
  students: SeedStudent[],
  badgeMap: Map<string, string>,
  topicMap: Map<string, string>,
  mentorMap: Map<string, string>,
  companyMap: Map<string, string>,
) {
  const problemRecords = await prisma.problem.findMany({ select: { id: true, slug: true, topicId: true } });
  const problemIdBySlug = new Map(problemRecords.map((problem) => [problem.slug, problem.id]));
  const problemsByTopic = problemRecords.reduce<Map<string, string[]>>((accumulator, problem) => {
    const current = accumulator.get(problem.topicId) ?? [];
    current.push(problem.slug);
    accumulator.set(problem.topicId, current);
    return accumulator;
  }, new Map());

  const challenges = await prisma.challenge.findMany();

  for (const [index, student] of students.entries()) {
    const solvedSet = new Set(student.solvedProblemSlugs);
    const attemptedSet = new Set([
      ...student.attemptedProblemSlugs,
      ...student.solvedProblemSlugs,
    ]);

    for (const problemSlug of attemptedSet) {
      await prisma.submissionStatus.create({
        data: {
          userId: student.id,
          problemId: problemIdBySlug.get(problemSlug)!,
          status: solvedSet.has(problemSlug) ? SubmissionState.SOLVED : SubmissionState.ATTEMPTED,
          attempts: solvedSet.has(problemSlug) ? 1 + (index % 2) : 2 + (index % 3),
          language: student.preferredLanguage,
          timeSpentMinutes: 20 + ((index + problemSlug.length) % 35),
          note: solvedSet.has(problemSlug)
            ? "Closed after revising the pattern and edge cases."
            : "Understood the pattern but still need one more clean pass.",
          solvedAt: solvedSet.has(problemSlug) ? subDays(new Date(), (index + problemSlug.length) % 20) : null,
          lastViewedAt: subDays(new Date(), (index + problemSlug.length) % 10),
        },
      });
    }

    for (const [bookmarkIndex, problemSlug] of [...attemptedSet].entries()) {
      if (bookmarkIndex % 3 === 0) {
        await prisma.bookmark.create({
          data: { userId: student.id, problemId: problemIdBySlug.get(problemSlug)! },
        });
      }

      if (bookmarkIndex % 4 === 0) {
        await prisma.revisionQueue.create({
          data: {
            userId: student.id,
            problemId: problemIdBySlug.get(problemSlug)!,
            remindOn: subDays(new Date(), -((bookmarkIndex % 5) + 1)),
            reason: "Needs one more timed revision pass.",
            priority: bookmarkIndex % 2 === 0 ? 1 : 2,
          },
        });
      }
    }

    for (const [checkinIndex, date] of student.checkinDates.entries()) {
      await prisma.dailyCheckin.create({
        data: {
          userId: student.id,
          date,
          minutesCommitted: student.dailyAvailableHours * 60 + (checkinIndex % 35),
          targetMinutes: student.dailyAvailableHours * 60,
          note: checkinIndex % 2 === 0 ? "Stayed on roadmap and closed revision before new questions." : "Small session, but no skipped day.",
          solvedCount: checkinIndex % 3 === 0 ? 2 : 1,
          pointsEarned: 12 + (checkinIndex % 9),
          sharedToWall: checkinIndex < student.publicCommitmentPosts,
        },
      });

      if (checkinIndex < student.publicCommitmentPosts) {
        await prisma.commitmentPost.create({
          data: {
            userId: student.id,
            caption:
              checkinIndex % 2 === 0
                ? "Showed up again today. Small progress, but the streak stays alive."
                : "Closing weak areas one session at a time. No missed day today.",
            minutesCommitted: student.dailyAvailableHours * 60 + (checkinIndex % 20),
            solvedCount: checkinIndex % 3 === 0 ? 2 : 1,
            isPublic: true,
            createdAt: date,
          },
        });
      }
    }

    const streakStats = calculateCurrentAndBestStreak(student.checkinDates);
    await prisma.streak.create({
      data: {
        userId: student.id,
        currentStreak: streakStats.currentStreak,
        bestStreak: streakStats.bestStreak,
        totalCheckins: student.checkinDates.length,
        lastCheckinDate: streakStats.lastCheckinDate,
      },
    });

    const weeklyConsistencyScore = calculateConsistencyScore(
      student.checkinDates.filter((date) => date >= subDays(new Date(), 6)).length,
      7,
    );
    const monthlyCommitmentScore = calculateConsistencyScore(
      student.checkinDates.filter((date) => date >= subDays(new Date(), 29)).length,
      30,
    );

    const bookmarkedCount = await prisma.bookmark.count({ where: { userId: student.id } });
    const revisionCount = await prisma.revisionQueue.count({ where: { userId: student.id } });

    const challengePoints = Math.round((weeklyConsistencyScore + monthlyCommitmentScore) / 4);
    await prisma.studentProfile.update({
      where: { userId: student.id },
      data: {
        weeklyConsistencyScore: Math.round(weeklyConsistencyScore),
        monthlyCommitmentScore: Math.round(monthlyCommitmentScore),
        commitmentScore: Math.round(
          calculateCommitmentScore({
            weeklyConsistencyScore,
            monthlyCommitmentScore,
            solvedProblemsCount: student.solvedProblemSlugs.length,
            currentStreak: streakStats.currentStreak,
          }),
        ),
        questionsSolvedCount: student.solvedProblemSlugs.length,
        bookmarkedCount,
        revisionCount,
        challengePoints,
      },
    });

    for (const [topicSlug, topicId] of topicMap.entries()) {
      const topicProblemSlugs = problemsByTopic.get(topicId) ?? [];
      const solvedProblemsCount = topicProblemSlugs.filter((slug) => solvedSet.has(slug)).length;
      const totalProblemsSnapshot = topicProblemSlugs.length;
      const completionPercentage =
        totalProblemsSnapshot === 0 ? 0 : (solvedProblemsCount / totalProblemsSnapshot) * 100;

      await prisma.progress.create({
        data: {
          userId: student.id,
          topicId,
          solvedProblemsCount,
          totalProblemsSnapshot,
          completionPercentage,
          confidenceScore: Math.round(Math.min(100, completionPercentage + (student.level === StudentLevel.ADVANCED ? 15 : student.level === StudentLevel.INTERMEDIATE ? 8 : 3))),
          note:
            solvedProblemsCount > 0
              ? `Progress is visible on ${topicSlug.replace(/-/g, " ")}. Keep revision active.`
              : "Topic not started yet.",
          lastPracticedAt: solvedProblemsCount > 0 ? subDays(new Date(), index % 8) : null,
        },
      });
    }

    for (const challenge of challenges) {
      const relevantCheckins = student.checkinDates.filter(
        (date) => date >= challenge.startDate && date <= challenge.endDate,
      );

      const completed = relevantCheckins.length >= challenge.targetValue;
      await prisma.challengeParticipation.create({
        data: {
          challengeId: challenge.id,
          userId: student.id,
          progressDays: relevantCheckins.length,
          completionPercentage: Math.round(
            Math.min(100, (relevantCheckins.length / challenge.targetValue) * 100),
          ),
          completedAt: completed ? challenge.endDate : null,
          status: completed ? ParticipationStatus.COMPLETED : ParticipationStatus.ACTIVE,
        },
      });
    }

    const mentorIds = [...mentorMap.values()];
    await prisma.mentorFollower.createMany({
      data: [
        { mentorId: mentorIds[index % mentorIds.length], studentId: student.id },
        { mentorId: mentorIds[(index + 2) % mentorIds.length], studentId: student.id },
      ],
      skipDuplicates: true,
    });

    if (index < 10) {
      await prisma.mentorQuestion.create({
        data: {
          mentorId: mentorIds[index % mentorIds.length],
          studentId: student.id,
          title: "How do I stop getting stuck after brute force?",
          question:
            "I can usually explain the basic idea, but I freeze when I need to optimize. How should I practice the transition from brute force to the real interview solution?",
        },
      });
    }

    await prisma.userBadge.createMany({
      data: [
        { userId: student.id, badgeId: badgeMap.get("first-checkin")! },
        ...(streakStats.bestStreak >= 7
          ? [{ userId: student.id, badgeId: badgeMap.get("7-day-challenger")! }]
          : []),
        ...(monthlyCommitmentScore >= 80
          ? [{ userId: student.id, badgeId: badgeMap.get("consistency-engine")! }]
          : []),
        ...(student.solvedProblemSlugs.length >= 16
          ? [{ userId: student.id, badgeId: badgeMap.get("topic-closer")! }]
          : []),
        ...(student.publicCommitmentPosts >= 10
          ? [{ userId: student.id, badgeId: badgeMap.get("wall-of-commitment")! }]
          : []),
        ...(student.solvedProblemSlugs.length >= 12
          ? [{ userId: student.id, badgeId: badgeMap.get("company-sprint")! }]
          : []),
      ],
      skipDuplicates: true,
    });
  }

  const communityAuthors = await prisma.user.findMany({
    where: {
      role: { in: [Role.STUDENT, Role.MENTOR, Role.COMPANY, Role.ADMIN] },
    },
    select: { id: true, role: true, slug: true },
  });

  const communityPosts = [
    {
      authorSlug: "riya-sharma",
      type: CommunityPostType.DOUBT,
      title: "When do you know a problem is actually sliding window?",
      content:
        "I keep confusing two pointers and sliding window. Is there a quick way to identify the right invariant before I start coding?",
      topicSlug: "sliding-window",
      companySlug: "amazon",
      isReported: false,
    },
    {
      authorSlug: "karthik-subramanian",
      type: CommunityPostType.COMPANY_PREP,
      title: "Google prep: graph first or DP first for limited time?",
      content:
        "I have five weeks left and I am already comfortable with arrays and trees. Would you prioritize graph traversal depth or a broader DP revision pass?",
      topicSlug: "graph",
      companySlug: "google",
      isReported: false,
    },
    {
      authorSlug: "aarav-menon",
      type: CommunityPostType.UPDATE,
      title: "A simple rule for graph interviews",
      content:
        "If you cannot explain what visited means in one sentence, pause before coding. State representation first, implementation second.",
      topicSlug: "graph",
      companySlug: "google",
      isReported: false,
    },
    {
      authorSlug: "dsa-commit-admin",
      type: CommunityPostType.DISCUSSION,
      title: "What breaks your DSA streak most often?",
      content:
        "The goal is to surface real blockers, not fake motivation. Time, confusion, burnout, placement pressure, or not knowing what to do next?",
      topicSlug: "programming-logic",
      companySlug: "tcs",
      isReported: true,
    },
  ];

  for (const [postIndex, post] of communityPosts.entries()) {
    const author = communityAuthors.find((user) => user.slug === post.authorSlug);
    const created = await prisma.communityPost.create({
      data: {
        authorId: author!.id,
        type: post.type,
        title: post.title,
        content: post.content,
        topicId: post.topicSlug ? topicMap.get(post.topicSlug) : undefined,
        companyId: post.companySlug ? companyMap.get(post.companySlug) : undefined,
        isReported: post.isReported,
      },
    });

    const likerPool = students.slice(0, 6).map((student) => ({
      postId: created.id,
      userId: student.id,
    }));
    const likeTotal = 2 + (postIndex % 3);
    await prisma.postLike.createMany({ data: likerPool.slice(0, likeTotal), skipDuplicates: true });

    await prisma.comment.createMany({
      data: students.slice(0, 2).map((student, commentIndex) => ({
        postId: created.id,
        authorId: student.id,
        content:
          commentIndex === 0
            ? "This is exactly the kind of confusion I keep having. Following."
            : "The invariant framing advice helped me a lot in recent mock sessions.",
      })),
    });

    await prisma.communityPost.update({
      where: { id: created.id },
      data: { likeCount: likeTotal, commentCount: 2 },
    });
  }
}

async function main() {
  await clearDatabase();

  const memberPassword =
    process.env.SEED_DEFAULT_PASSWORD?.trim() || defaultCredentials.memberPassword;
  const memberPasswordHash = await hashPassword(memberPassword);

  const { badgeMap, topicMap, companyMap, mentorMap } =
    await createBaseUsersAndContent(memberPasswordHash);
  const students = await createStudents(memberPasswordHash, companyMap, topicMap);
  await createStudentActivity(students, badgeMap, topicMap, mentorMap, companyMap);

  console.log("Seed completed.");
  console.log(`Admin: ${defaultCredentials.admin.email} / ${defaultCredentials.admin.password}`);
  console.log(`Shared member password: ${memberPassword}`);
  console.log("Student sample: student01@dsacommit.dev");
  console.log("Mentor sample: aarav@dsacommit.dev");
  console.log("Company sample: google@dsacommit.dev");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
