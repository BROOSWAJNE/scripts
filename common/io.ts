// Utilities for user and file IO

import { range } from './iter.ts';
import { red } from './colors.ts';

const BUFFER_SIZE = 1024;

const encoder = new TextEncoder( );

/** Yields lines read from the given reader. */
export async function* readLines(reader: Deno.Reader) {
	let currentLine = '';
	const buffer = new Uint8Array(BUFFER_SIZE);
	const decoder = new TextDecoder( );

	while (true) {
		const numBytesRead = await reader.read(buffer);
		if (numBytesRead == null) { // EOF
			if (currentLine) yield currentLine;
			return; // nothing left to read
		}
		// badly implemented .read()
		if (numBytesRead < 0) throw new Error(`Read ${numBytesRead} bytes`);

		const bytesRead = buffer.subarray(0, numBytesRead);
		const strRead = decoder.decode(bytesRead);
		const lines = strRead.split('\n');
		if (lines.length > 1) yield currentLine + lines[0];
		for (const idx of range(1, lines.length - 1)) yield lines[idx];
		currentLine = lines[lines.length - 1];
	}
}

/** Returns the first line read from the given reader. */
export async function readLine(reader: Deno.Reader): Promise<string> {
	let line = '';
	const buffer = new Uint8Array(BUFFER_SIZE);
	const decoder = new TextDecoder( );

	while (true) {
		const numBytesRead = await reader.read(buffer);
		if (numBytesRead == null) throw new Error('EOF reached without newline');
		if (numBytesRead < 0) throw new Error(`Read ${numBytesRead} bytes`);

		const bytesRead = buffer.subarray(0, numBytesRead);
		const strRead = decoder.decode(bytesRead);
		const newline = strRead.indexOf('\n');
		if (newline) return line + strRead.slice(0, newline);
		else line = line + strRead;
	}
}

export async function writeText(writer: Deno.Writer, text: string) {
	const bytes = encoder.encode(text);
	await Deno.writeAll(writer, bytes);
}

/** Prompts the user using the given message. */
export async function prompt(prompt: string): Promise<string> {
	await writeText(Deno.stdout, prompt);
	// TODO: masking for passwords?
	const answer = await readLine(Deno.stdin);
	await writeText(Deno.stdout, '\n');
	return answer;
}

/** Exits the currently running script, displaying the given error message. */
export function abort(reason: string): never {
	console.log(red(reason));
	Deno.exit(1);
}
