import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoadingSpinner } from "./LoadingSpinner";

describe("LoadingSpinner", () => {
  it("does not impose page height in compact overlays", () => {
    const { container } = render(<LoadingSpinner compact />);
    const spinner = container.querySelector('[data-slot="loading-spinner"]');

    expect(spinner?.classList.contains("inline-flex")).toBe(true);
    expect(spinner?.classList.contains("min-h-screen")).toBe(false);
    expect(spinner?.firstElementChild?.classList.contains("h-6")).toBe(true);
    expect(spinner?.firstElementChild?.classList.contains("w-6")).toBe(true);
  });
});
