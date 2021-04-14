#! /usr/bin/env deno run --allow-env --allow-net --allow-read --allow-write

import {
	UNNAMED_ARGUMENTS,
	parse,
} from './common/args.ts';
import {
	bold,
	cyan,
	dim,
	green,
	magenta,
} from './common/colors.ts';
import { abort } from './common/io.ts';

import {
	readMapping,
	saveMapping,
	startJob,
} from './apis/jenkins.ts';

const USAGE = [
	`${bold('Usage')}: jenkins.ts [job] <...options>`,
	'Starts the specified Jenkins job.',
	'',
	'Options:',
	`  ${cyan(`${bold('--save')} -s`)} Associates the current working directory with the given job, `,
	'            so that a job name isn\'t required next time.',
	`  ${cyan(`${bold('--help')} -h`)} Prints this help message.`,
].join('\n');

const cwd = Deno.cwd( );
const args = parse(Deno.args);

const shouldHelp = args['help'] || args['h'];
const shouldSave = args['save'] || args['s'];

if (shouldHelp) (console.log(USAGE), Deno.exit(0));

const job = args[UNNAMED_ARGUMENTS][0] ?? await (async function getJobFromMapping( ) {
	console.log(dim('No job specifed - attempting to read from mapping file.'));
	const mapping = await readMapping( );
	const job = mapping[cwd];
	if (!job) console.log(`No entry for ${cyan(cwd)} in mapping file.`);
	return job;
}( ));

if (!job) abort('No job specified.');

if (shouldSave) {
	const mapping = await readMapping( );
	console.log(`Saving mapping: ${cyan(cwd)} -> ${magenta(job)}`);
	mapping[cwd] = job;
	await saveMapping(mapping);
}

console.log(`Starting job: ${bold(magenta(job))}`);
await startJob(job).then(
	( ) => console.log(green('Job started successfully.')),
	(err: Error) => abort(`Request unsuccessful - ${err.message}`),
);
