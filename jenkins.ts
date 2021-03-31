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
	red,
} from './common/colors.ts';
import { required } from './common/env.ts';

// Constants

type Mapping = Record<string, string | void>;

const JENKINS_API_USER = await required('JENKINS_API_USER', 'Your Jenkins username.');
const JENKINS_API_TOKEN = await required('JENKINS_API_TOKEN', 'Your Jenkins API token - generate it on the settings page.');
const JENKINS_URL_BASE = await required('JENKINS_URL_BASE', 'Your Jenkins instance\'s base URL.');

const AUTH_FIELDS = `${JENKINS_API_USER}:${JENKINS_API_TOKEN}`;
const AUTH_HEADER = `Basic ${btoa(AUTH_FIELDS)}`;

const USAGE = [
	`${bold('Usage')}: jenkins.ts [job] <...options>`,
	'',
	'Options:',
	`  ${cyan('-s --save')} Associates the current working directory with the given job, so that a job name isn\'t required next time.`,
].join('\n');

// Utility Functions

let mappingPath: string | null = null;

function abort(reason: string) {
	console.log(red(reason));
	Deno.exit(1);
}
async function getMappingPath( ) {
	if (!mappingPath) mappingPath = await required(
		'JENKINS_JOBS_MAPPING_PATH', 
		'A path to a file which this script can edit to save a Jenkins job <-> directory mapping.',
	);
	return mappingPath;
}
async function readMapping( ): Promise<Mapping> {
	const file = await getMappingPath( );

	console.log(dim(`Reading existing mapping at: ${bold(file)}`));
	const data = await Deno.readFile(file);
	const json = new TextDecoder( ).decode(data);
	const mapping = JSON.parse(json);

	// validate
	if (typeof mapping !== 'object') abort('Invalid mapping file contents');
	if (mapping == null) abort('Invalid mapping file contents');
	if (Array.isArray(mapping)) abort('Invalid mapping file contents');

	return mapping;
}
async function saveMapping(mapping: Mapping) {
	const file = await getMappingPath( );

	console.log(dim(`Saving updated mapping to: ${bold(file)}`));
	const updated = new TextEncoder( ).encode(JSON.stringify(mapping, null, 2));
	await Deno.writeFile(file, updated);
}

// Script

const cwd = Deno.cwd( );
const args = parse(Deno.args);

const shouldHelp = args['help'] || args['h'];
const shouldSave = args['save'] || args['s'];

if (shouldHelp) (console.log(USAGE), Deno.exit(0));

const job = args[UNNAMED_ARGUMENTS][0] ?? await (async function getJobFromMapping( ) {
	console.log(dim('No job specifed - attempting to read from mapping file.'));
	const mapping = await readMapping( );
	return mapping[cwd];
}( ));
if (!job) abort('No job specified');

if (shouldSave) {
	const mapping = await readMapping( );
	console.log(`Saving mapping: ${cyan(cwd)} -> ${magenta(job)}`);
	mapping[cwd] = job;
	await saveMapping(mapping);
}

console.log(`Starting job: ${bold(magenta(job))}`);

const urlJob = `${JENKINS_URL_BASE}/job/${job}/`;
const url = `${urlJob}build?delay=0`;
console.log(dim(`POST ${url}`));

const res = await fetch(url, {
	method: 'POST',
	redirect: 'manual',
	headers: { 'Authorization': AUTH_HEADER },
});
if (res.status !== 302) abort(`Unexpected response code: ${bold(res.status)}`);
const urlRedirect = res.headers.get('location');
if (urlRedirect !== urlJob) abort(`Unexpected redirect: ${bold(urlRedirect)}`);

console.log(green('Job started successfully.'));
