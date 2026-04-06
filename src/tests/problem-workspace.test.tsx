import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProblemWorkspace } from "@/components/problems/problem-workspace";
import { CodeLanguage } from "@/generated/prisma/enums";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({
    resolvedTheme: "light",
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@uiw/react-codemirror", () => ({
  default: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: string) => void;
  }) => (
    <textarea
      aria-label="Code editor"
      onChange={(event) => onChange(event.target.value)}
      value={value}
    />
  ),
}));

vi.mock("@codemirror/lang-javascript", () => ({
  javascript: () => [],
}));

vi.mock("@codemirror/theme-one-dark", () => ({
  oneDark: {},
}));

describe("ProblemWorkspace", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders the editor and hydrates from a saved local draft", async () => {
    window.localStorage.setItem(
      "dsa-commit:problem-1:TYPESCRIPT",
      'export function solve(input: string): string {\n  return "draft";\n}\n// draft',
    );

    render(
      <ProblemWorkspace
        latestCodeSubmission={null}
        problemId="problem-1"
        problemTitle="Pair Sum Checkpoint"
        starterCode={"export function solve(input: string): string {\n  return \"\";\n}\n"}
        starterLanguage={CodeLanguage.TYPESCRIPT}
        visibleTestCases={[
          {
            id: "tc-1",
            label: "Sample 1",
            input: "nums = [1,2], target = 3",
            expectedOutput: "true",
            isHidden: false,
            sortOrder: 1,
          },
        ]}
      />,
    );

    const editor = await screen.findByLabelText("Code editor");
    expect((editor as HTMLTextAreaElement).value).toContain("export function solve");

    await waitFor(() => {
      expect((editor as HTMLTextAreaElement).value).toContain("// draft");
    });
  });
});
