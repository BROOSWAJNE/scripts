/** @file Utility to parse command line arguments */

export const UNNAMED_ARGUMENTS = Symbol('Unnamed Arguments');
export interface Arguments {
	[ arg: string ]: string[] | string | boolean;
	[ UNNAMED_ARGUMENTS ]: string[];
}

/** Parses command line arguments (or any provided array of string arguments). */
export function parse(args: string[] = Deno.args): Arguments {
	const parsed: Arguments = {
		[ UNNAMED_ARGUMENTS ]: [ ],
	};
	const unparsed = Array.from(args).reverse( );

	let current: string | null = null;
	function clearCurrent( ) {
		if (current == null) return;
		const hasValues = current in parsed;
		if (hasValues) return;
		// had no values, so was used as a flag (eg. script.ts --foo --bar)
		parsed[current] = true;
	}

	while (unparsed.length) {
		const arg = unparsed.pop( ) as string;
		if (arg === '--') clearCurrent( );
		else if (arg.startsWith('--')) { 
			clearCurrent( );
			current = arg.slice('--'.length);
		} else if (arg.startsWith('-')) {
			clearCurrent( );
			const flags = arg.slice('-'.length).split('');
			for (const flag of flags) parsed[flag] = true;
		} else if (current !== null) {
			const hasValues = current in parsed;
			if (!hasValues) parsed[current] = arg; 
			if (!hasValues) continue;

			const values = parsed[current];
			if (typeof values === 'boolean') throw new Error(`Argument --${current} provided both as a flag and with values`);
			if (typeof values === 'string') parsed[current] = [ values ];
			(parsed[current] as string[]).push(arg);
		} else parsed[UNNAMED_ARGUMENTS].push(arg);
	}
	clearCurrent( );

	return parsed;
}
