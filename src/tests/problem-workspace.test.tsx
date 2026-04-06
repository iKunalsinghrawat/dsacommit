import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
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

vi.mock("@uiw/codemirror-extensions-langs", () => ({
  langs: {
    c: () => [],
    cpp: () => [],
    java: () => [],
    python: () => [],
    js: () => [],
    ts: () => [],
    go: () => [],
    cs: () => [],
    kt: () => [],
    rs: () => [],
  },
}));

vi.mock("@codemirror/theme-one-dark", () => ({
  oneDark: {},
}));

describe("ProblemWorkspace", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders all supported language options", async () => {
    render(
      <ProblemWorkspace
        codeDrafts={[]}
        latestCodeSubmissions={[]}
        problemExamples={[
          {
            input: "nums = [1,2], target = 3",
            output: "true",
            explanation: "1 + 2 = 3",
          },
        ]}
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

    const selector = screen.getByLabelText("Language");
    expect(selector.querySelectorAll("option")).toHaveLength(10);
    expect(screen.getByRole("option", { name: "C++" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Rust" })).toBeInTheDocument();
  });

  it("hydrates language-specific drafts from local storage and preserves code while switching", async () => {
    window.localStorage.setItem(
      "dsa-commit:problem-1:TYPESCRIPT",
      'export function solve(input: string): string {\n  return "ts";\n}\n',
    );
    window.localStorage.setItem(
      "dsa-commit:problem-1:PYTHON",
      'def solve(raw_input: str) -> str:\n    return "py"\n',
    );

    const user = userEvent.setup();

    render(
      <ProblemWorkspace
        codeDrafts={[]}
        latestCodeSubmissions={[]}
        problemExamples={[
          {
            input: "nums = [1,2], target = 3",
            output: "true",
            explanation: "1 + 2 = 3",
          },
        ]}
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

    await waitFor(() => {
      expect((screen.getByLabelText("Code editor") as HTMLTextAreaElement).value).toContain('return "ts"');
    });

    await user.selectOptions(screen.getByLabelText("Language"), CodeLanguage.PYTHON);

    await waitFor(() => {
      expect((screen.getByLabelText("Code editor") as HTMLTextAreaElement).value).toContain('return "py"');
    });

    await user.selectOptions(screen.getByLabelText("Language"), CodeLanguage.TYPESCRIPT);

    await waitFor(() => {
      expect((screen.getByLabelText("Code editor") as HTMLTextAreaElement).value).toContain('return "ts"');
    });
  });

  it("persists the selected language for the same problem after refresh", async () => {
    const user = userEvent.setup();

    const props = {
      codeDrafts: [],
      latestCodeSubmissions: [],
      problemExamples: [
        {
          input: "nums = [1,2], target = 3",
          output: "true",
          explanation: "1 + 2 = 3",
        },
      ],
      problemId: "problem-1",
      problemTitle: "Pair Sum Checkpoint",
      starterCode: 'export function solve(input: string): string {\n  return "";\n}\n',
      starterLanguage: CodeLanguage.TYPESCRIPT,
      visibleTestCases: [
        {
          id: "tc-1",
          label: "Sample 1",
          input: "nums = [1,2], target = 3",
          expectedOutput: "true",
          isHidden: false,
          sortOrder: 1,
        },
      ],
    } satisfies ComponentProps<typeof ProblemWorkspace>;

    const view = render(<ProblemWorkspace {...props} />);

    await user.selectOptions(screen.getByLabelText("Language"), CodeLanguage.RUST);

    expect(window.localStorage.getItem("dsa-commit:selected-language:problem-1")).toBe(CodeLanguage.RUST);

    view.unmount();

    render(<ProblemWorkspace {...props} />);

    await waitFor(() => {
      expect((screen.getByLabelText("Language") as HTMLSelectElement).value).toBe(CodeLanguage.RUST);
    });
  });
});
