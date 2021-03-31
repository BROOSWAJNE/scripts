// Utilities for colouring output

/** Whether colours are enabled for the current session. */
export const COLORS_ENABLED = Deno.env.get('NO_COLOR') == null
	&& Deno.env.get('TERM') !== 'dumb'
	&& Deno.isatty(Deno.stdout.rid);
export const ESCAPE = '\x1b[';

export type Color = (...args: unknown[]) => string;

const stringify = (thing: unknown) => typeof thing === 'string' ? thing : Deno.inspect(thing, { colors: false });
export const createColor = (code: number, reset = 0): Color => Object.assign(function(...args: unknown[]) {
	const open = `${ESCAPE}${code}m`;
	const close = `${ESCAPE}${reset}m`;
	const string = args
		.map(stringify)
		.join(' ')
		.replaceAll(close, `${close}${open}`);
	return `${open}${string}${close}`;
}, { toString: ( ) => ESCAPE + code + 'm' });

export const reset     = createColor(0);
export const bold      = createColor(1, 22);
export const dim       = createColor(2, 22);
export const italic    = createColor(3, 23);
export const underline = createColor(4, 24);

export const black     = createColor(30, 39);
export const red       = createColor(31, 39);
export const green     = createColor(32, 39);
export const yellow    = createColor(33, 39);
export const blue      = createColor(34, 39);
export const magenta   = createColor(35, 39);
export const cyan      = createColor(36, 39);
export const white     = createColor(37, 39);
