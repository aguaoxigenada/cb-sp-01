/** Pads a score to a fixed-width, zero-filled string (e.g. 42 -> "00042"). */
export function formatScore(score: number, width = 5): string {
	return Math.floor(score).toString().padStart(width, "0");
}
