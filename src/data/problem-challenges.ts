import { problemSeed, type ProblemSeed } from "@/data/problem-bank";

type ProblemChallengeTestCaseSeed = {
  label: string;
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
  sortOrder: number;
};

type ProblemChallengeSeed = {
  starterCode: string;
  starterLanguage: "TYPESCRIPT";
  testCases: ProblemChallengeTestCaseSeed[];
};

function createStarterCode(problem: ProblemSeed) {
  const example = problem.examples[0];

  return `export function solve(input: string): string {
  // ${problem.title}
  // Read the raw input string, compute the answer, and return the final output as a string.
  // Example input: ${example?.input ?? "See the visible test cases"}
  // Expected output format: ${example?.output ?? "Return the final answer as a string"}

  return "";
}
`;
}

function createFallbackChallenge(problem: ProblemSeed): ProblemChallengeSeed {
  const example = problem.examples[0];

  return {
    starterCode: createStarterCode(problem),
    starterLanguage: "TYPESCRIPT",
    testCases: [
      {
        label: "Sample 1",
        input: example?.input ?? "input = ?",
        expectedOutput: example?.output ?? "",
        sortOrder: 1,
      },
      {
        label: "Locked check",
        input: example?.input ?? "input = ?",
        expectedOutput: example?.output ?? "",
        isHidden: true,
        sortOrder: 2,
      },
    ],
  };
}

const challengeOverrides: Record<string, Partial<ProblemChallengeSeed>> = {
  "pair-sum-checkpoint": {
    starterCode: `function parseArray(input: string, key: string) {
  const match = input.match(new RegExp(\`\${key}\\\\s*=\\\\s*(\\\\[[^\\\\]]*\\\\])\`));
  return match ? (JSON.parse(match[1]) as number[]) : [];
}

function parseNumber(input: string, key: string) {
  const match = input.match(new RegExp(\`\${key}\\\\s*=\\\\s*(-?\\\\d+)\`));
  return match ? Number(match[1]) : 0;
}

export function solve(input: string): string {
  const nums = parseArray(input, "nums");
  const target = parseNumber(input, "target");

  // TODO: return "true" or "false"
  return "false";
}
`,
    testCases: [
      {
        label: "Sample 1",
        input: "nums = [3, 5, 1, 7], target = 8",
        expectedOutput: "true",
        sortOrder: 1,
      },
      {
        label: "Sample 2",
        input: "nums = [4, 6, 9], target = 20",
        expectedOutput: "false",
        sortOrder: 2,
      },
      {
        label: "Locked check 1",
        input: "nums = [-2, 11, 7, 15], target = 9",
        expectedOutput: "true",
        isHidden: true,
        sortOrder: 3,
      },
      {
        label: "Locked check 2",
        input: "nums = [1, 2, 4, 8], target = 7",
        expectedOutput: "false",
        isHidden: true,
        sortOrder: 4,
      },
    ],
  },
  "rotate-array-by-k": {
    testCases: [
      {
        label: "Sample 1",
        input: "nums = [1,2,3,4,5], k = 2",
        expectedOutput: "[4,5,1,2,3]",
        sortOrder: 1,
      },
      {
        label: "Sample 2",
        input: "nums = [7,8,9], k = 4",
        expectedOutput: "[9,7,8]",
        sortOrder: 2,
      },
      {
        label: "Locked check",
        input: "nums = [10,20,30,40], k = 0",
        expectedOutput: "[10,20,30,40]",
        isHidden: true,
        sortOrder: 3,
      },
    ],
  },
  "longest-unique-substring": {
    testCases: [
      {
        label: "Sample 1",
        input: "s = \"abcaef\"",
        expectedOutput: "5",
        sortOrder: 1,
      },
      {
        label: "Sample 2",
        input: "s = \"bbbb\"",
        expectedOutput: "1",
        sortOrder: 2,
      },
      {
        label: "Locked check",
        input: "s = \"pwwkew\"",
        expectedOutput: "3",
        isHidden: true,
        sortOrder: 3,
      },
    ],
  },
  "search-rotated-array": {
    testCases: [
      {
        label: "Sample 1",
        input: "nums = [4,5,6,7,0,1,2], target = 0",
        expectedOutput: "4",
        sortOrder: 1,
      },
      {
        label: "Sample 2",
        input: "nums = [4,5,6,7,0,1,2], target = 3",
        expectedOutput: "-1",
        sortOrder: 2,
      },
      {
        label: "Locked check",
        input: "nums = [6,7,1,2,3,4,5], target = 6",
        expectedOutput: "0",
        isHidden: true,
        sortOrder: 3,
      },
    ],
  },
  "number-of-islands": {
    testCases: [
      {
        label: "Sample 1",
        input: "grid = [[1,1,0],[1,0,0],[0,1,1]]",
        expectedOutput: "2",
        sortOrder: 1,
      },
      {
        label: "Sample 2",
        input: "grid = [[1,1],[1,1]]",
        expectedOutput: "1",
        sortOrder: 2,
      },
      {
        label: "Locked check",
        input: "grid = [[1,0,1],[0,1,0],[1,0,1]]",
        expectedOutput: "5",
        isHidden: true,
        sortOrder: 3,
      },
    ],
  },
  "reverse-linked-list": {
    testCases: [
      {
        label: "Sample 1",
        input: "1 -> 2 -> 3 -> 4",
        expectedOutput: "4 -> 3 -> 2 -> 1",
        sortOrder: 1,
      },
      {
        label: "Sample 2",
        input: "5",
        expectedOutput: "5",
        sortOrder: 2,
      },
      {
        label: "Locked check",
        input: "10 -> 20 -> 30",
        expectedOutput: "30 -> 20 -> 10",
        isHidden: true,
        sortOrder: 3,
      },
    ],
  },
};

export const problemChallengeSeed = Object.fromEntries(
  problemSeed.map((problem) => {
    const fallback = createFallbackChallenge(problem);
    const override = challengeOverrides[problem.slug];

    return [
      problem.slug,
      {
        ...fallback,
        ...override,
        testCases: override?.testCases ?? fallback.testCases,
      },
    ];
  }),
) as Record<string, ProblemChallengeSeed>;
