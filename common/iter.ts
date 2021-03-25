// Iterator utilities

/** Iterates over the given range of numbers. */
export function* range(start: number, end: number) {
	let current = start;
	while (current < end) yield current++;
}
