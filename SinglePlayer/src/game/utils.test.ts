import { describe, expect, it } from "vitest";
import { formatScore } from "./utils";

describe("formatScore", () => {
	it("zero-pads to five digits by default", () => {
		expect(formatScore(0)).toBe("00000");
		expect(formatScore(42)).toBe("00042");
		expect(formatScore(12345)).toBe("12345");
	});

	it("floors fractional scores", () => {
		expect(formatScore(99.9)).toBe("00099");
	});

	it("respects a custom width", () => {
		expect(formatScore(7, 3)).toBe("007");
	});

	it("does not truncate scores longer than the width", () => {
		expect(formatScore(123456)).toBe("123456");
	});
});
