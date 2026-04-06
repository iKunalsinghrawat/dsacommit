"use client";

import type { Extension } from "@codemirror/state";
import { Code2, Sparkles } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { getLanguageConfig } from "@/config/languages";
import { CodeLanguage } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

type CodeMirrorComponent = typeof import("@uiw/react-codemirror").default;
type CodeMirrorTheme = typeof import("@codemirror/theme-one-dark").oneDark;
type LangsMap = typeof import("@uiw/codemirror-extensions-langs").langs;

type LoadedEditor = {
  Editor: CodeMirrorComponent;
  darkTheme: CodeMirrorTheme;
  langs: LangsMap;
};

export function CodeEditorSurface({
  className,
  language,
  value,
  onChange,
  disabled = false,
  minHeight = 380,
}: {
  className?: string;
  language: CodeLanguage;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  minHeight?: number;
}) {
  const { resolvedTheme } = useTheme();
  const [loadedEditor, setLoadedEditor] = useState<LoadedEditor | null>(null);

  const languageConfig = getLanguageConfig(language);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      import("@uiw/react-codemirror"),
      import("@uiw/codemirror-extensions-langs"),
      import("@codemirror/theme-one-dark"),
    ]).then(([editorModule, languageModule, themeModule]) => {
      if (!mounted) {
        return;
      }

      setLoadedEditor({
        Editor: editorModule.default,
        langs: languageModule.langs,
        darkTheme: themeModule.oneDark,
      });
    });

    return () => {
      mounted = false;
    };
  }, []);

  const extensions = useMemo<Extension[]>(() => {
    if (!loadedEditor) {
      return [];
    }

    const extensionFactory = loadedEditor.langs[languageConfig.monacoLanguage as keyof LangsMap];

    if (!extensionFactory) {
      return [];
    }

    return [extensionFactory()];
  }, [languageConfig.monacoLanguage, loadedEditor]);

  const fileName = `solution.${languageConfig.fileExtension}`;

  if (!loadedEditor) {
    return (
      <div className={cn("overflow-hidden rounded-[28px] border border-border bg-background/70", className)}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              <Code2 className="size-3.5" />
              {fileName}
            </Badge>
            <Badge variant="outline">{languageConfig.label}</Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <Sparkles className="size-3.5" />
            Loading editor
          </div>
        </div>
        <textarea
          aria-label="Code editor"
          className="min-h-[380px] w-full bg-background/70 p-4 font-mono text-sm leading-7 text-foreground outline-none"
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          style={{ minHeight }}
          value={value}
        />
      </div>
    );
  }

  const Editor = loadedEditor.Editor;

  return (
    <div className={cn("overflow-hidden rounded-[28px] border border-border bg-background/70", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            <Code2 className="size-3.5" />
            {fileName}
          </Badge>
          <Badge variant="outline">{languageConfig.label}</Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <Sparkles className="size-3.5" />
          Syntax highlighting active
        </div>
      </div>
      <Editor
        basicSetup={{
          autocompletion: true,
          bracketMatching: true,
          closeBrackets: true,
          foldGutter: false,
          highlightActiveLineGutter: true,
          lineNumbers: true,
        }}
        editable={!disabled}
        extensions={extensions}
        height={`${minHeight}px`}
        onChange={onChange}
        theme={resolvedTheme === "dark" ? loadedEditor.darkTheme : undefined}
        value={value}
      />
    </div>
  );
}
