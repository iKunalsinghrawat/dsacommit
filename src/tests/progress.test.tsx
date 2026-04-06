import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Progress } from "@/components/ui/progress";

describe("Progress component", () => {
  it("renders an accessible progress bar shell", () => {
    render(<Progress value={72} />);
    const fill = screen.getByRole("progressbar").firstChild as HTMLElement;
    expect(fill.style.width).toBe("72%");
  });
});
