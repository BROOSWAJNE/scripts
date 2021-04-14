/** @file Interfaces and methods for interacting with Timewarrior */

import { readLines } from '../common/io.ts';

const RX_TIMEW_DATE = /^(?<year>\d{4})(?<month>\d{2})(?<day>\d{2})T(?<hour>\d{2})(?<minute>\d{2})(?<second>\d{2})Z$/;

interface RecordRaw {
	id: number,
	start: string,
	end: string | undefined,
	tags: string[],
}
export interface Record {
	/** The record's numeric id. */
	id: number,
	/** The record's start date. */
	start: Date,
	/** The record's end date, if null then the record is currently ongoing. */
	end: Date | null,
	/** The record's tags. */
	tags: string[],
}

/** Turns a Timewarrior-formatted date into a JS `Date()` object. */
export function parseTimewDate(date: string): Date {
	const match = date.match(RX_TIMEW_DATE);
	if (match == null) throw new Error(`Unexpected format for timewarrior date: ${date}`);

	const groups = match.groups!;
	const isoString = `${groups.year}-${groups.month}-${groups.day}T${groups.hour}:${groups.minute}:${groups.second}Z`;

	return new Date(isoString);
}

/** Parses a raw JSON string into a Timewarrior record, validating that the JSON is of the expected format. */
function parseTimewRecordRaw(record: string): RecordRaw {
	const raw = JSON.parse(record);
	// validate field presence
	if (!('id' in raw)) throw new TypeError(`Timewarrior record missing id field: ${record}`);
	if (!('start' in raw)) throw new TypeError(`Timewarrior record missing start field: ${record}`);
	if (!('tags' in raw)) throw new TypeError(`Timewarrior record missing tags field: ${record}`);
	// end is optional (if still ongoing)
	const isEnded = 'end' in raw;
	// validate field types
	if (typeof raw.id !== 'number') throw new TypeError(`Non-numeric id for Timewarrior record: ${record}`);
	if (typeof raw.start !== 'string') throw new TypeError(`Non-string start date for Timewarrior record: ${record}`);
	if (isEnded && typeof raw.end !== 'string') throw new TypeError(`Non-string end date for Timewarrior record: ${record}`);
	if (!Array.isArray(raw.tags)) throw new TypeError(`Non-array tags for  Timewarrior record: ${record}`);
	if (!raw.tags.every((tag: string) => typeof tag === 'string')) throw new TypeError(`Non-string tag for Timewarrior record: ${record}`);
	return raw as RecordRaw;
}

/** Parses a raw JSON string into a Timewarrior record, validating that the JSON is of the expected format. */
export function parseTimewRecord(record: string): Record {
	const raw = parseTimewRecordRaw(record);
	return {
		id: raw.id,
		start: parseTimewDate(raw.start),
		end: raw.end ? parseTimewDate(raw.end) : null,
		tags: raw.tags,
	};
}

export async function* iterateRecords( ): AsyncGenerator<Record> {
	const exporter = Deno.run({
		cmd: [ 'timew', 'export' ],
		stdout: 'piped',
		stderr: 'piped',
	});

	const lines = readLines(exporter.stdout);
	for await (const line of lines) {
		// first/final line
		if (line === '[' || line === ']') continue;

		// line might have a trailing comma if not final
		const json = line.endsWith(',') ? line.slice(0, -1) : line;
		const record = parseTimewRecord(json);
		yield record;
	}
}
