import { describe, expect, it } from "vitest";

import {
  DEFAULT_PAGE_SIZE,
  buildPaginatedResult,
  paginationRange,
  parsePageParam,
} from "@/lib/data/pagination";

describe("pagination", () => {
  it("parses positive page numbers with fallback", () => {
    expect(parsePageParam("3")).toBe(3);
    expect(parsePageParam("0")).toBe(1);
    expect(parsePageParam("-2")).toBe(1);
    expect(parsePageParam("abc")).toBe(1);
    expect(parsePageParam(undefined, 5)).toBe(5);
  });

  it("builds paginated result and range", () => {
    expect(buildPaginatedResult(["a", "b"], 30, 2, DEFAULT_PAGE_SIZE)).toEqual({
      items: ["a", "b"],
      total: 30,
      page: 2,
      pageSize: 15,
      totalPages: 2,
    });
    expect(buildPaginatedResult([], 0, 1, 15).totalPages).toBe(1);
    expect(paginationRange(1, 15)).toEqual({ from: 0, to: 14 });
    expect(paginationRange(3, 10)).toEqual({ from: 20, to: 29 });
  });
});
