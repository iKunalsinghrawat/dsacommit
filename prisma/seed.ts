import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { faker } from "@faker-js/faker";
import { startOfDay, subDays } from "date-fns";

import { Prisma, PrismaClient } from "../src/generated/prisma/client";
import {
  CallParticipantStatus,
  CallSessionStatus,
  CallType,
  CareerTarget,
  ChangeRequestEntityType,
  ChangeRequestOperationType,
  ChangeRequestStatus,
  ConnectionRequestStatus,
  ConversationParticipantRole,
  ConversationType,
  CommunityPostType,
  GroupJoinPolicy,
  GroupJoinRequestStatus,
  GroupMemberRole,
  GroupPrivacy,
  NotificationType,
  ParticipationStatus,
  ProfileVisibility,
  RoadmapLevel,
  Role,
  SignalingEventType,
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
import { createDirectConversationKey } from "../src/lib/communication";

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

function toJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

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
  await prisma.callSignal.deleteMany();
  await prisma.callParticipant.deleteMany();
  await prisma.callSession.deleteMany();
  await prisma.messageReadState.deleteMany();
  await prisma.directMessage.deleteMany();
  await prisma.conversationParticipant.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.userBlock.deleteMany();
  await prisma.userConnection.deleteMany();
  await prisma.connectionRequest.deleteMany();
  await prisma.groupJoinRequest.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.changeRequestReview.deleteMany();
  await prisma.changeRequest.deleteMany();
  await prisma.codeDraft.deleteMany();
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

  const roadmapItemMap = new Map<string, string>();
  for (const roadmapItem of roadmapItemSeed) {
    const createdRoadmapItem = await prisma.roadmapItem.create({
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
    roadmapItemMap.set(roadmapItem.slug, createdRoadmapItem.id);
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

  const problemMap = new Map<string, string>();
  for (const problem of problemSeed) {
    const challenge = problemChallengeSeed[problem.slug];

    const createdProblem = await prisma.problem.create({
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
    problemMap.set(problem.slug, createdProblem.id);
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

  return {
    adminUser,
    badgeMap,
    topicMap,
    roadmapItemMap,
    companyMap,
    companyOwnerMap,
    mentorMap,
    problemMap,
  };
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
        profileVisibility: index % 7 === 0 ? ProfileVisibility.PRIVATE : ProfileVisibility.PUBLIC,
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

async function createApprovalWorkflowFixtures(input: {
  adminUserId: string;
  students: SeedStudent[];
  topicMap: Map<string, string>;
  roadmapItemMap: Map<string, string>;
  companyMap: Map<string, string>;
  problemMap: Map<string, string>;
}) {
  const [studentOne, studentTwo, studentThree, studentFour, studentFive] = input.students;
  const arraysTopicId = input.topicMap.get("arrays")!;
  const graphRoadmapId = input.roadmapItemMap.get("roadmap-graph")!;
  const firstProblemId = input.problemMap.get(problemSeed[0].slug)!;

  const arraysTopic = await prisma.topic.findUnique({
    where: { id: arraysTopicId },
    select: {
      id: true,
      name: true,
      slug: true,
      level: true,
      sortOrder: true,
      conceptSummary: true,
      notes: true,
      difficultyProgression: true,
      revisionChecklist: true,
      quiz: true,
      estimatedHours: true,
      icon: true,
      accentColor: true,
      isArchived: true,
    },
  });

  const graphRoadmapItem = await prisma.roadmapItem.findUnique({
    where: { id: graphRoadmapId },
    select: {
      id: true,
      title: true,
      slug: true,
      level: true,
      summary: true,
      details: true,
      sortOrder: true,
      topicId: true,
      isArchived: true,
    },
  });

  const firstProblem = await prisma.problem.findUnique({
    where: { id: firstProblemId },
    select: {
      id: true,
      title: true,
      slug: true,
      difficulty: true,
      topicId: true,
      problemStatement: true,
      examples: true,
      constraints: true,
      hints: true,
      editorial: true,
      similarProblemSlugs: true,
      roleFocus: true,
      frequency: true,
      estimatedMinutes: true,
      codeExecutionEnabled: true,
      starterCode: true,
      starterLanguage: true,
      isArchived: true,
      companyTags: {
        select: {
          companyId: true,
          frequency: true,
          role: true,
          notes: true,
        },
        orderBy: [{ companyId: "asc" }, { frequency: "asc" }],
      },
      testCases: {
        select: {
          label: true,
          input: true,
          expectedOutput: true,
          isHidden: true,
          sortOrder: true,
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!arraysTopic || !graphRoadmapItem || !firstProblem) {
    throw new Error("Approval workflow fixtures require seeded topic, roadmap, and problem records.");
  }

  const pendingTopicUpdate = {
    name: arraysTopic.name,
    slug: arraysTopic.slug,
    level: arraysTopic.level,
    sortOrder: arraysTopic.sortOrder,
    conceptSummary:
      "Arrays teach indexing, iteration, and the habit of spotting prefix sums, windows, and in-place transforms before overcomplicating the solution.",
    notes:
      "Students should first classify whether the problem is about direct indexing, carrying state forward, or shrinking a window. Prefix sums and in-place mutation both deserve explicit revision notes.",
    difficultyProgression: arraysTopic.difficultyProgression,
    revisionChecklist: arraysTopic.revisionChecklist,
    quiz: arraysTopic.quiz,
    estimatedHours: arraysTopic.estimatedHours,
    icon: arraysTopic.icon,
    accentColor: arraysTopic.accentColor,
  };

  await prisma.changeRequest.create({
    data: {
      entityType: ChangeRequestEntityType.TOPIC,
      operationType: ChangeRequestOperationType.UPDATE,
      status: ChangeRequestStatus.PENDING,
      entityId: arraysTopic.id,
      summary: "Update topic: Arrays with a clearer prefix-sum explanation",
      requestedById: studentOne.id,
      requestedData: toJsonValue(pendingTopicUpdate),
      currentData: toJsonValue(arraysTopic),
    },
  });

  const pendingRoadmapUpdate = {
    title: graphRoadmapItem.title,
    slug: graphRoadmapItem.slug,
    level: graphRoadmapItem.level,
    summary:
      "Shift this checkpoint to emphasize traversal state, connected components, and shortest-path pattern selection before heavier graph optimization.",
    details:
      "Add a stronger distinction between representation choice, visited semantics, BFS vs DFS reasoning, and when to jump from traversal into shortest-path or topological workflows.",
    sortOrder: graphRoadmapItem.sortOrder,
    topicId: input.topicMap.get("graph"),
  };

  await prisma.changeRequest.create({
    data: {
      entityType: ChangeRequestEntityType.ROADMAP_ITEM,
      operationType: ChangeRequestOperationType.UPDATE,
      status: ChangeRequestStatus.PENDING,
      entityId: graphRoadmapItem.id,
      summary: "Update roadmap item: Graph with a stronger traversal checkpoint",
      requestedById: studentTwo.id,
      requestedData: toJsonValue(pendingRoadmapUpdate),
      currentData: toJsonValue(graphRoadmapItem),
    },
  });

  const pendingProblemCreate = {
    title: "Rotation Window Checkpoint",
    slug: "rotation-window-checkpoint",
    difficulty: "MEDIUM",
    topicId: input.topicMap.get("sliding-window")!,
    problemStatement:
      "Given a binary array, return the minimum swaps required to group all 1s together in a circular array.",
    examples: [
      {
        input: "nums = [0,1,0,1,1,0,0]",
        output: "1",
        explanation:
          "A circular window of size equal to the count of ones can capture three ones with one misplaced zero.",
      },
    ],
    constraints: ["1 <= nums.length <= 10^5", "nums[i] is either 0 or 1"],
    hints: [
      "Count the total number of ones first.",
      "Use a sliding window of that size over a doubled view of the array.",
    ],
    editorial:
      "Treat the circular array by scanning a window across indices modulo n. The answer is the number of zeros in the best window of size totalOnes.",
    similarProblemSlugs: [problemSeed[0]?.slug ?? "pair-sum-checkpoint"],
    roleFocus: "Intern",
    frequency: 4,
    estimatedMinutes: 35,
    codeExecutionEnabled: true,
    starterCode: "export function solve(input: string): string {\n  return \"\";\n}\n",
    starterLanguage: "TYPESCRIPT",
    companyTags: [
      {
        companyId: input.companyMap.get("amazon")!,
        frequency: 4,
        role: "Intern",
        notes: "Common sliding-window variation for OA practice.",
      },
    ],
    testCases: [
      {
        label: "Sample 1",
        input: "[0,1,0,1,1,0,0]",
        expectedOutput: "1",
        isHidden: false,
        sortOrder: 1,
      },
      {
        label: "Edge",
        input: "[1,1,1,1]",
        expectedOutput: "0",
        isHidden: true,
        sortOrder: 2,
      },
    ],
  };

  await prisma.changeRequest.create({
    data: {
      entityType: ChangeRequestEntityType.PROBLEM,
      operationType: ChangeRequestOperationType.CREATE,
      status: ChangeRequestStatus.PENDING,
      summary: "Create problem: Rotation window checkpoint",
      requestedById: studentThree.id,
      requestedData: toJsonValue(pendingProblemCreate),
    },
  });

  const publishedRoadmapItem = await prisma.roadmapItem.create({
    data: {
      title: "Greedy Interview Checkpoint",
      slug: "roadmap-greedy-interview-checkpoint",
      level: RoadmapLevel.ADVANCED,
      summary:
        "Add a checkpoint focused on proving why the greedy choice is safe before implementation.",
      details:
        "Students should practice identifying the decision invariant, proving local optimality, and checking the failure mode that would break a greedy approach.",
      sortOrder: 10,
      topicId: input.topicMap.get("greedy"),
    },
  });

  const approvedRoadmapRequest = await prisma.changeRequest.create({
    data: {
      entityType: ChangeRequestEntityType.ROADMAP_ITEM,
      operationType: ChangeRequestOperationType.CREATE,
      status: ChangeRequestStatus.APPROVED,
      entityId: publishedRoadmapItem.id,
      summary: "Create roadmap item: Greedy interview checkpoint",
      requestedById: studentFour.id,
      requestedData: toJsonValue({
        title: publishedRoadmapItem.title,
        slug: publishedRoadmapItem.slug,
        level: publishedRoadmapItem.level,
        summary: publishedRoadmapItem.summary,
        details: publishedRoadmapItem.details,
        sortOrder: publishedRoadmapItem.sortOrder,
        topicId: publishedRoadmapItem.topicId,
      }),
      reviewedById: input.adminUserId,
      reviewedAt: new Date(),
    },
  });

  await prisma.changeRequestReview.create({
    data: {
      requestId: approvedRoadmapRequest.id,
      reviewerId: input.adminUserId,
      status: ChangeRequestStatus.APPROVED,
    },
  });

  const rejectedProblemRequest = await prisma.changeRequest.create({
    data: {
      entityType: ChangeRequestEntityType.PROBLEM,
      operationType: ChangeRequestOperationType.DELETE,
      status: ChangeRequestStatus.REJECTED,
      entityId: firstProblem.id,
      summary: `Remove problem: ${firstProblem.title}`,
      requestedById: studentFive.id,
      requestedData: toJsonValue({
        deletionReason:
          "Requesting review because this problem overlaps too much with another set and needs replacement, not direct removal.",
      }),
      currentData: toJsonValue(firstProblem),
      rejectionReason:
        "Keep the live problem for now. Replace it with a stronger alternative before requesting removal again.",
      reviewedById: input.adminUserId,
      reviewedAt: new Date(),
    },
  });

  await prisma.changeRequestReview.create({
    data: {
      requestId: rejectedProblemRequest.id,
      reviewerId: input.adminUserId,
      status: ChangeRequestStatus.REJECTED,
      note:
        "Keep the live problem for now. Replace it with a stronger alternative before requesting removal again.",
    },
  });
}

async function createCommunicationFixtures() {
  const communicationUsers = await prisma.user.findMany({
    where: {
      email: {
        in: [
          "student01@dsacommit.dev",
          "student02@dsacommit.dev",
          "student03@dsacommit.dev",
          "student04@dsacommit.dev",
          "student05@dsacommit.dev",
          "aarav@dsacommit.dev",
        ],
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      slug: true,
      role: true,
    },
  });

  const usersByEmail = new Map(
    communicationUsers.map((user) => [user.email, user]),
  );

  const studentOne = usersByEmail.get("student01@dsacommit.dev");
  const studentTwo = usersByEmail.get("student02@dsacommit.dev");
  const studentThree = usersByEmail.get("student03@dsacommit.dev");
  const studentFour = usersByEmail.get("student04@dsacommit.dev");
  const studentFive = usersByEmail.get("student05@dsacommit.dev");
  const mentor = usersByEmail.get("aarav@dsacommit.dev");

  if (
    !studentOne ||
    !studentTwo ||
    !studentThree ||
    !studentFour ||
    !studentFive ||
    !mentor
  ) {
    return;
  }

  const createMessageWithReadStates = async (input: {
    conversationId: string;
    senderId: string;
    content: string;
    deliveredTo: string[];
    readBy: string[];
    createdAt?: Date;
  }) => {
    const messageTimestamp = input.createdAt ?? new Date();

    const message = await prisma.directMessage.create({
      data: {
        conversationId: input.conversationId,
        senderId: input.senderId,
        content: input.content,
        createdAt: messageTimestamp,
      },
    });

    await prisma.messageReadState.createMany({
      data: input.deliveredTo.map((userId) => ({
        messageId: message.id,
        userId,
        deliveredAt: messageTimestamp,
        readAt: input.readBy.includes(userId) ? messageTimestamp : null,
      })),
    });

    await prisma.conversation.update({
      where: { id: input.conversationId },
      data: {
        lastMessageAt: messageTimestamp,
        lastMessagePreview: input.content.slice(0, 120),
      },
    });

    return message;
  };

  const acceptedConnectionPairs = [
    [studentOne.id, studentTwo.id],
    [studentTwo.id, studentThree.id],
  ].map(([firstUserId, secondUserId]) => [firstUserId, secondUserId].sort() as [string, string]);

  await prisma.userConnection.createMany({
    data: acceptedConnectionPairs.map(([userOneId, userTwoId]) => ({
      userOneId,
      userTwoId,
    })),
    skipDuplicates: true,
  });

  await prisma.connectionRequest.createMany({
    data: [
      {
        senderId: studentThree.id,
        receiverId: studentOne.id,
        status: ConnectionRequestStatus.PENDING,
      },
      {
        senderId: studentOne.id,
        receiverId: studentFour.id,
        status: ConnectionRequestStatus.PENDING,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.userBlock.createMany({
    data: [
      {
        blockerId: studentOne.id,
        blockedId: studentFive.id,
      },
    ],
    skipDuplicates: true,
  });

  const studentConversation = await prisma.conversation.upsert({
    where: {
      directKey: createDirectConversationKey(studentOne.id, studentTwo.id),
    },
    create: {
      type: ConversationType.DIRECT,
      directKey: createDirectConversationKey(studentOne.id, studentTwo.id),
      createdById: studentOne.id,
      participants: {
        create: [
          { userId: studentOne.id },
          { userId: studentTwo.id },
        ],
      },
    },
    update: {},
  });

  const mentorConversation = await prisma.conversation.upsert({
    where: {
      directKey: createDirectConversationKey(studentOne.id, mentor.id),
    },
    create: {
      type: ConversationType.DIRECT,
      directKey: createDirectConversationKey(studentOne.id, mentor.id),
      createdById: studentOne.id,
      participants: {
        create: [
          { userId: studentOne.id },
          { userId: mentor.id },
        ],
      },
    },
    update: {},
  });

  await createMessageWithReadStates({
    conversationId: studentConversation.id,
    senderId: studentOne.id,
    content:
      "Let's solve two graph mediums this week and review each other's approach before moving to harder variants.",
    deliveredTo: [studentOne.id, studentTwo.id],
    readBy: [studentOne.id, studentTwo.id],
    createdAt: subDays(new Date(), 1),
  });

  await createMessageWithReadStates({
    conversationId: studentConversation.id,
    senderId: studentTwo.id,
    content:
      "I'm in. Start with traversal state and shortest-path pattern recognition, then we'll compare notes on Friday.",
    deliveredTo: [studentOne.id, studentTwo.id],
    readBy: [studentTwo.id],
  });

  await createMessageWithReadStates({
    conversationId: mentorConversation.id,
    senderId: studentOne.id,
    content:
      "I'm getting stuck turning brute force graph ideas into the right BFS or DFS framing. Can you suggest a sharper checkpoint?",
    deliveredTo: [studentOne.id, mentor.id],
    readBy: [studentOne.id, mentor.id],
  });

  await createMessageWithReadStates({
    conversationId: mentorConversation.id,
    senderId: mentor.id,
    content:
      "Before coding, say the state transition out loud: what makes a node visited, what work happens on entry, and what stops revisits from corrupting the answer.",
    deliveredTo: [studentOne.id, mentor.id],
    readBy: [mentor.id],
  });

  const arraysGroup = await prisma.group.create({
    data: {
      slug: "arrays-accountability-circle",
      name: "Arrays Accountability Circle",
      description:
        "A compact daily practice room for arrays, windows, and prefix sums with short accountability check-ins.",
      category: "Arrays",
      privacy: GroupPrivacy.PUBLIC,
      joinPolicy: GroupJoinPolicy.OPEN,
      createdById: studentOne.id,
    },
  });

  await prisma.groupMember.createMany({
    data: [
      {
        groupId: arraysGroup.id,
        userId: studentOne.id,
        role: GroupMemberRole.OWNER,
        addedById: studentOne.id,
      },
      {
        groupId: arraysGroup.id,
        userId: studentTwo.id,
        role: GroupMemberRole.ADMIN,
        addedById: studentOne.id,
      },
      {
        groupId: arraysGroup.id,
        userId: studentThree.id,
        role: GroupMemberRole.MEMBER,
        addedById: studentTwo.id,
      },
    ],
  });

  const arraysGroupConversation = await prisma.conversation.create({
    data: {
      type: ConversationType.GROUP,
      groupId: arraysGroup.id,
      createdById: studentOne.id,
      participants: {
        create: [
          {
            userId: studentOne.id,
            role: ConversationParticipantRole.ADMIN,
          },
          {
            userId: studentTwo.id,
            role: ConversationParticipantRole.ADMIN,
          },
          {
            userId: studentThree.id,
          },
        ],
      },
    },
  });

  await createMessageWithReadStates({
    conversationId: arraysGroupConversation.id,
    senderId: studentOne.id,
    content:
      "Today's goal: one sliding-window easy, one prefix-sum medium, then post the exact invariant you used.",
    deliveredTo: [studentOne.id, studentTwo.id, studentThree.id],
    readBy: [studentOne.id, studentTwo.id],
  });

  const privateGroup = await prisma.group.create({
    data: {
      slug: "google-bfs-pod",
      name: "Google BFS Pod",
      description:
        "Private prep pod for students focusing on BFS, grids, and interview-quality explanation habits.",
      category: "Google prep",
      privacy: GroupPrivacy.PRIVATE,
      joinPolicy: GroupJoinPolicy.APPROVAL,
      createdById: studentTwo.id,
    },
  });

  await prisma.groupMember.create({
    data: {
      groupId: privateGroup.id,
      userId: studentTwo.id,
      role: GroupMemberRole.OWNER,
      addedById: studentTwo.id,
    },
  });

  await prisma.conversation.create({
    data: {
      type: ConversationType.GROUP,
      groupId: privateGroup.id,
      createdById: studentTwo.id,
      participants: {
        create: {
          userId: studentTwo.id,
          role: ConversationParticipantRole.ADMIN,
        },
      },
    },
  });

  await prisma.groupJoinRequest.create({
    data: {
      groupId: privateGroup.id,
      requesterId: studentFour.id,
      status: GroupJoinRequestStatus.PENDING,
      message:
        "I'm working through BFS grids this week and can show up daily for short review updates.",
    },
  });

  const ringingCall = await prisma.callSession.create({
    data: {
      conversationId: studentConversation.id,
      initiatedById: studentOne.id,
      callType: CallType.VIDEO,
      status: CallSessionStatus.RINGING,
      participants: {
        create: [
          {
            userId: studentOne.id,
            status: CallParticipantStatus.JOINED,
            joinedAt: new Date(),
          },
          {
            userId: studentTwo.id,
            status: CallParticipantStatus.INVITED,
          },
        ],
      },
    },
  });

  await prisma.callSignal.create({
    data: {
      callSessionId: ringingCall.id,
      senderId: studentOne.id,
      type: SignalingEventType.READY,
      payload: {
        callType: "video",
        note: "Offer channel ready",
      },
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: studentOne.id,
        actorId: studentThree.id,
        type: NotificationType.CONNECTION_REQUEST,
        title: "New connection request",
        body: `${studentThree.name} wants to connect for practice accountability.`,
        actionUrl: "/connections",
      },
      {
        userId: studentTwo.id,
        actorId: studentFour.id,
        type: NotificationType.GROUP_JOIN_REQUEST,
        title: "New group join request",
        body: `${studentFour.name} requested access to ${privateGroup.name}.`,
        actionUrl: `/groups/${privateGroup.slug}`,
      },
      {
        userId: studentTwo.id,
        actorId: studentOne.id,
        type: NotificationType.INCOMING_CALL,
        title: "Incoming video call",
        body: "Open the conversation to accept or decline the call.",
        actionUrl: `/messages/${studentConversation.id}`,
      },
    ],
  });
}

async function main() {
  await clearDatabase();

  const memberPassword =
    process.env.SEED_DEFAULT_PASSWORD?.trim() || defaultCredentials.memberPassword;
  const memberPasswordHash = await hashPassword(memberPassword);

  const { adminUser, badgeMap, topicMap, roadmapItemMap, companyMap, mentorMap, problemMap } =
    await createBaseUsersAndContent(memberPasswordHash);
  const students = await createStudents(memberPasswordHash, companyMap, topicMap);
  await createStudentActivity(students, badgeMap, topicMap, mentorMap, companyMap);
  await createApprovalWorkflowFixtures({
    adminUserId: adminUser.id,
    students,
    topicMap,
    roadmapItemMap,
    companyMap,
    problemMap,
  });
  await createCommunicationFixtures();

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
