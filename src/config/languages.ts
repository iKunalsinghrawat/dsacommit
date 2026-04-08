import { CodeLanguage } from "@/generated/prisma/enums";

export type CodeLanguageExecutionMode = "local" | "remote";

export type CodeStarterTemplateContext = {
  problemTitle: string;
  sampleInput?: string | null;
  sampleOutput?: string | null;
  starterCode?: string | null;
  starterLanguage?: CodeLanguage | null;
};

export type CodeLanguageConfig = {
  id: CodeLanguage;
  label: string;
  monacoLanguage: string;
  fileExtension: string;
  versionLabel: string;
  executionMode: CodeLanguageExecutionMode;
  judge0NamePatterns: RegExp[];
  defaultTemplate: (context: CodeStarterTemplateContext) => string;
};

function normalizeExampleValue(value: string | null | undefined) {
  if (!value) {
    return "See the visible sample tests.";
  }

  return value.replace(/\r\n/g, "\n").trim().split("\n").join(" | ");
}

function buildCommentLines(prefix: string, context: CodeStarterTemplateContext) {
  const sampleInput = normalizeExampleValue(context.sampleInput);
  const sampleOutput = normalizeExampleValue(context.sampleOutput);

  return [
    `${prefix} ${context.problemTitle}`,
    `${prefix} Read the full stdin / raw input, compute the answer, and print or return the final result.`,
    `${prefix} Sample input: ${sampleInput}`,
    `${prefix} Sample output: ${sampleOutput}`,
  ].join("\n");
}

function maybeUseProblemStarterCode(
  language: CodeLanguage,
  context: CodeStarterTemplateContext,
  fallback: string,
) {
  if (context.starterCode && context.starterLanguage === language) {
    return context.starterCode;
  }

  return fallback;
}

export const supportedCodeLanguages = [
  CodeLanguage.C,
  CodeLanguage.CPP,
  CodeLanguage.JAVA,
  CodeLanguage.PYTHON,
  CodeLanguage.JAVASCRIPT,
  CodeLanguage.TYPESCRIPT,
  CodeLanguage.GO,
  CodeLanguage.CSHARP,
  CodeLanguage.KOTLIN,
  CodeLanguage.RUST,
] as const;

export const languageConfig = {
  [CodeLanguage.C]: {
    id: CodeLanguage.C,
    label: "C",
    monacoLanguage: "c",
    fileExtension: "c",
    versionLabel: "GCC 13.x",
    executionMode: "remote",
    judge0NamePatterns: [/^C \(/i],
    defaultTemplate: (context) =>
      maybeUseProblemStarterCode(
        CodeLanguage.C,
        context,
        `#include <stdio.h>\n#include <string.h>\n\n${buildCommentLines("//", context)}\n\nvoid solve(const char *input, char *output, size_t outputSize) {\n  // TODO: parse input and write the final answer to output.\n  snprintf(output, outputSize, \"\");\n}\n\nint main(void) {\n  char input[8192];\n  size_t length = fread(input, 1, sizeof(input) - 1, stdin);\n  input[length] = '\\0';\n\n  char output[8192];\n  solve(input, output, sizeof(output));\n  printf(\"%s\", output);\n  return 0;\n}\n`,
      ),
  },
  [CodeLanguage.CPP]: {
    id: CodeLanguage.CPP,
    label: "C++",
    monacoLanguage: "cpp",
    fileExtension: "cpp",
    versionLabel: "G++ 13.x",
    executionMode: "remote",
    judge0NamePatterns: [/^C\+\+ \(/i],
    defaultTemplate: (context) =>
      maybeUseProblemStarterCode(
        CodeLanguage.CPP,
        context,
        `#include <iostream>\n#include <iterator>\n#include <string>\n\nusing namespace std;\n\n${buildCommentLines("//", context)}\n\nstring solve(const string& input) {\n  // TODO: parse input and return the final answer.\n  return \"\";\n}\n\nint main() {\n  ios::sync_with_stdio(false);\n  cin.tie(nullptr);\n\n  string input((istreambuf_iterator<char>(cin)), istreambuf_iterator<char>());\n  cout << solve(input);\n  return 0;\n}\n`,
      ),
  },
  [CodeLanguage.JAVA]: {
    id: CodeLanguage.JAVA,
    label: "Java",
    monacoLanguage: "java",
    fileExtension: "java",
    versionLabel: "OpenJDK 21",
    executionMode: "remote",
    judge0NamePatterns: [/^Java \(/i],
    defaultTemplate: (context) =>
      maybeUseProblemStarterCode(
        CodeLanguage.JAVA,
        context,
        `import java.nio.charset.StandardCharsets;\n\npublic class Main {\n${buildCommentLines("  //", context)}\n\n  static String solve(String input) {\n    // TODO: parse input and return the final answer.\n    return \"\";\n  }\n\n  public static void main(String[] args) throws Exception {\n    String input = new String(System.in.readAllBytes(), StandardCharsets.UTF_8);\n    System.out.print(solve(input));\n  }\n}\n`,
      ),
  },
  [CodeLanguage.PYTHON]: {
    id: CodeLanguage.PYTHON,
    label: "Python",
    monacoLanguage: "python",
    fileExtension: "py",
    versionLabel: "Python 3.11",
    executionMode: "remote",
    judge0NamePatterns: [/^Python \(/i],
    defaultTemplate: (context) =>
      maybeUseProblemStarterCode(
        CodeLanguage.PYTHON,
        context,
        `import sys\n\n${buildCommentLines("#", context)}\n\n\ndef solve(raw_input: str) -> str:\n    # TODO: parse raw_input and return the final answer.\n    return \"\"\n\n\nif __name__ == \"__main__\":\n    data = sys.stdin.read()\n    sys.stdout.write(solve(data))\n`,
      ),
  },
  [CodeLanguage.JAVASCRIPT]: {
    id: CodeLanguage.JAVASCRIPT,
    label: "JavaScript",
    monacoLanguage: "js",
    fileExtension: "js",
    versionLabel: "Node.js 20.x",
    executionMode: "local",
    judge0NamePatterns: [/^JavaScript \(/i],
    defaultTemplate: (context) =>
      maybeUseProblemStarterCode(
        CodeLanguage.JAVASCRIPT,
        context,
        `${buildCommentLines("//", context)}\n\nexport function solve(input) {\n  // TODO: parse input and return the final answer as a string.\n  return \"\";\n}\n`,
      ),
  },
  [CodeLanguage.TYPESCRIPT]: {
    id: CodeLanguage.TYPESCRIPT,
    label: "TypeScript",
    monacoLanguage: "ts",
    fileExtension: "ts",
    versionLabel: "TypeScript 5.x",
    executionMode: "local",
    judge0NamePatterns: [/^TypeScript \(/i],
    defaultTemplate: (context) =>
      maybeUseProblemStarterCode(
        CodeLanguage.TYPESCRIPT,
        context,
        `${buildCommentLines("//", context)}\n\nexport function solve(input: string): string {\n  // TODO: parse input and return the final answer as a string.\n  return \"\";\n}\n`,
      ),
  },
  [CodeLanguage.GO]: {
    id: CodeLanguage.GO,
    label: "Go",
    monacoLanguage: "go",
    fileExtension: "go",
    versionLabel: "Go 1.22",
    executionMode: "remote",
    judge0NamePatterns: [/^Go \(/i],
    defaultTemplate: (context) =>
      maybeUseProblemStarterCode(
        CodeLanguage.GO,
        context,
        `package main\n\nimport (\n  "fmt"\n  "io"\n  "os"\n)\n\n${buildCommentLines("//", context)}\n\nfunc solve(input string) string {\n  // TODO: parse input and return the final answer.\n  return \"\"\n}\n\nfunc main() {\n  data, _ := io.ReadAll(os.Stdin)\n  fmt.Print(solve(string(data)))\n}\n`,
      ),
  },
  [CodeLanguage.CSHARP]: {
    id: CodeLanguage.CSHARP,
    label: "C#",
    monacoLanguage: "cs",
    fileExtension: "cs",
    versionLabel: ".NET 8",
    executionMode: "remote",
    judge0NamePatterns: [/^C# \(/i],
    defaultTemplate: (context) =>
      maybeUseProblemStarterCode(
        CodeLanguage.CSHARP,
        context,
        `using System;\n\npublic static class Program\n{\n${buildCommentLines("    //", context)}\n\n    private static string Solve(string input)\n    {\n        // TODO: parse input and return the final answer.\n        return string.Empty;\n    }\n\n    public static void Main()\n    {\n        var input = Console.In.ReadToEnd();\n        Console.Write(Solve(input));\n    }\n}\n`,
      ),
  },
  [CodeLanguage.KOTLIN]: {
    id: CodeLanguage.KOTLIN,
    label: "Kotlin",
    monacoLanguage: "kt",
    fileExtension: "kt",
    versionLabel: "Kotlin 1.9",
    executionMode: "remote",
    judge0NamePatterns: [/^Kotlin \(/i],
    defaultTemplate: (context) =>
      maybeUseProblemStarterCode(
        CodeLanguage.KOTLIN,
        context,
        `object Main {\n${buildCommentLines("    //", context)}\n\n    private fun solve(input: String): String {\n        // TODO: parse input and return the final answer.\n        return \"\"\n    }\n\n    @JvmStatic\n    fun main(args: Array<String>) {\n        val input = generateSequence(::readLine).joinToString(\"\\n\")\n        print(solve(input))\n    }\n}\n`,
      ),
  },
  [CodeLanguage.RUST]: {
    id: CodeLanguage.RUST,
    label: "Rust",
    monacoLanguage: "rs",
    fileExtension: "rs",
    versionLabel: "Rust 1.77",
    executionMode: "remote",
    judge0NamePatterns: [/^Rust \(/i],
    defaultTemplate: (context) =>
      maybeUseProblemStarterCode(
        CodeLanguage.RUST,
        context,
        `use std::io::{self, Read};\n\n${buildCommentLines("//", context)}\n\nfn solve(input: &str) -> String {\n    // TODO: parse input and return the final answer.\n    String::new()\n}\n\nfn main() {\n    let mut input = String::new();\n    io::stdin().read_to_string(&mut input).unwrap();\n    print!(\"{}\", solve(&input));\n}\n`,
      ),
  },
} satisfies Record<CodeLanguage, CodeLanguageConfig>;

export function getLanguageConfig(language: CodeLanguage) {
  return languageConfig[language];
}

export function getLanguageOptions() {
  return supportedCodeLanguages.map((language) => {
    const config = getLanguageConfig(language);

    return {
      value: config.id,
      label: config.label,
    };
  });
}

export function supportsLocalExecution(language: CodeLanguage) {
  return getLanguageConfig(language).executionMode === "local";
}

export function usesRemoteExecution(language: CodeLanguage) {
  return getLanguageConfig(language).executionMode === "remote";
}

export function supportsExecution(language: CodeLanguage) {
  return supportsLocalExecution(language) || usesRemoteExecution(language);
}

export function getExecutionUnavailableMessage(language: CodeLanguage) {
  const config = getLanguageConfig(language);

  return `${config.label} execution is currently unavailable. Check the configured code execution provider and try again.`;
}

export function createStarterTemplateForLanguage(
  language: CodeLanguage,
  context: CodeStarterTemplateContext,
) {
  return getLanguageConfig(language).defaultTemplate(context);
}
