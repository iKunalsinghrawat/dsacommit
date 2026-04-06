"use client";

import type { Extension } from "@codemirror/state";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type CodeMirrorComponent = typeof import("@uiw/react-codemirror").default;
type CodeMirrorTheme = typeof import("@codemirror/theme-one-dark").oneDark;

type LoadedEditor = {
  Editor: CodeMirrorComponent;
  extensions: Extension[];
  darkTheme: CodeMirrorTheme;
};

export function CodeEditorSurface({
  className,
  value,
  onChange,
  disabled = false,
  minHeight = 380,
}: {
  className?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  minHeight?: number;
}) {
  const { resolvedTheme } = useTheme();
  const [loadedEditor, setLoadedEditor] = useState<LoadedEditor | null>(null);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      import("@uiw/react-codemirror"),
      import("@codemirror/lang-javascript"),
      import("@codemirror/theme-one-dark"),
    ]).then(([editorModule, languageModule, themeModule]) => {
      if (!mounted) {
        return;
      }

      setLoadedEditor({
        Editor: editorModule.default,
        extensions: [languageModule.javascript({ typescript: true })],
        darkTheme: themeModule.oneDark,
      });
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (!loadedEditor) {
    return (
      <textarea
        aria-label="Code editor"
        className={cn(
          "min-h-[380px] w-full rounded-[24px] border border-border bg-background/70 p-4 font-mono text-sm leading-7 text-foreground outline-none focus:ring-2 focus:ring-ring",
          className,
        )}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        style={{ minHeight }}
        value={value}
      />
    );
  }

  const Editor = loadedEditor.Editor;

  return (
    <div className={cn("overflow-hidden rounded-[24px] border border-border bg-background/70", className)}>
      <Editor
        basicSetup={{
          foldGutter: false,
          highlightActiveLineGutter: true,
        }}
        editable={!disabled}
        extensions={loadedEditor.extensions}
        height={`${minHeight}px`}
        onChange={onChange}
        theme={resolvedTheme === "dark" ? loadedEditor.darkTheme : undefined}
        value={value}
      />
    </div>
  );
}
