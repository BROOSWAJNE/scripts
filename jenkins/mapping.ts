// Utilities for storing a mapping of working directories to Jenkins job names

import { 
	dim,
	bold,
} from '../common/colors.ts';
import { required } from '../common/env.ts';

export type Mapping = Record<string, string | void>;

let mappingPath: string | null;

/** Gets the path to the mapping file, prompting the user for it if necessary. */
export async function getMappingPath( ) {
	if (!mappingPath) mappingPath = await required(
		'JENKINS_JOBS_MAPPING_PATH', 
		'A path to a file which this script can edit to save a Jenkins job <-> directory mapping.',
	);
	return mappingPath;
}
export async function readMapping( ): Promise<Mapping> {
	const file = await getMappingPath( );

	console.log(dim(`Reading existing mapping at: ${bold(file)}`));
	const data = await Deno.readFile(file);
	const json = new TextDecoder( ).decode(data);
	const mapping = JSON.parse(json);

	// validate
	if (typeof mapping !== 'object') throw new Error('Invalid mapping file contents');
	if (mapping == null) throw new Error('Invalid mapping file contents');
	if (Array.isArray(mapping)) throw new Error('Invalid mapping file contents');

	return mapping;
}
export async function saveMapping(mapping: Mapping) {
	const file = await getMappingPath( );

	console.log(dim(`Saving updated mapping to: ${bold(file)}`));
	const updated = new TextEncoder( ).encode(JSON.stringify(mapping, null, 2));
	await Deno.writeFile(file, updated);
}
