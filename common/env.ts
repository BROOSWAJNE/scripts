// Utilities for getting environment variables

import {
	bold,
	cyan,
	dim,
	italic,
} from './colors.ts';
import { prompt } from './io.ts';

/**
 * Gets an environment variable.
 * @param {string} variable
 * The name of the environment variable.
 * @param {string} [description]
 * If provided, is used as extra context to the user to explain why this variable is wanted
 * when prompting the user.
 */
export async function optional(variable: string, description?: string): Promise<string | null> {
	const value = Deno.env.get(variable) ?? await prompt([
		`Environment variable ${cyan(bold(variable))} not defined.`,
		...description ? `\n${cyan(italic(description))}` : '',
		`\n${dim(`${variable} =`)} `
	].join(''));
	return value ?? null;
}
/**
 * Gets an environment variable.
 * Throws an error if the variable is not present.
 * @param {string} variable
 * The name of the environment variable.
 * @param {string} [description]
 * If provided, is used as extra context to the user to explain why this variable is wanted
 * when prompting the user.
 */
export async function required(variable: string, description?: string): Promise<string> {
	const value = await optional(variable, description);
	if (value == null) throw new Error(`Missing environment variable: ${variable}`);
	return value;
}
