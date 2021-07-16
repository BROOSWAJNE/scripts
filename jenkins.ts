#! /usr/bin/env deno run --allow-env --allow-net --allow-read --allow-write --allow-run

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
	yellow,
} from './common/colors.ts';
import { abort } from './common/io.ts';

import {
	getBranchURLAbsolute,
	getBuildURLAbsolute,
	getImage,
	getJobURLAbsolute,
	readMapping,
	saveMapping,
	startJob,
} from './apis/jenkins.ts';
import { getCurrentBranchName } from './apis/git.ts';

const COMMAND_ALIASES = {
	'b': 'build',
	'i': 'image',
	'img': 'image',
	'o': 'open',
	's': 'build',
	'start': 'build',
	'v': 'open',
	'view': 'open',
} as Record<string, string | undefined>;
const COMMAND_DEFAULT = 'build';
const getAliases = (command: string) => (Object.keys(COMMAND_ALIASES) as Array<keyof typeof COMMAND_ALIASES>)
	.filter((alias) => COMMAND_ALIASES[alias] === command);

const USAGE = [
	`${bold('Usage')}: jenkins.ts [command] <...options>`,
	'',
	'Global Options:',
	`  ${cyan(`${bold('--help')} -h`)} Prints this help message.`,
	`  ${cyan(`${bold('--save')} -s`)} Associates the current working directory with the given job, `,
	'            so that a job name isn\'t required next time.',
	'',
	'Commands:',
	`  ${magenta(`jenkins.ts ${bold('build')} [job] <...options>`)}`,
	`  Aliases: ${getAliases('build').map((alias) => magenta(alias)).join(' / ') || '< none >'}`,
	'  Starts the specified Jenkins job.',
	'',
	`  ${magenta(`jenkins.ts ${bold('image')} [job] <branch> <build> <...options>`)}`,
	`  ${cyan(bold('--branch'))} Explicitly specify the branch, while leaving the job as`,
	'           automatic.',
	`  ${cyan(bold('--build'))}  Explicitly specify the build number, while leaving the job`,
	'           and/or branch as automatic.',
	`  Aliases: ${getAliases('image').map((alias) => magenta(alias)).join(' / ') || '< none >'}`,
	'  Gets the docker image for the latest (or specified) build of the given',
	'  job.',
	'',
	`  ${magenta(`jenkins.ts ${bold('open')} [job] <branch> <build> <...options>`)}`,
	`  Aliases: ${getAliases('image').map((alias) => magenta(alias)).join(' / ') || '< none >'}`,
	'  Opens the given job in a web browser.',
	'',
	`Default command: ${magenta(COMMAND_DEFAULT)}`,
].join('\n');

const cwd = Deno.cwd( );
const args = parse(Deno.args);

const shouldHelp = args['help'] || args['h'];
const shouldSave = args['save'] || args['s'];

if (shouldHelp) (console.log(USAGE), Deno.exit(0));

const command = COMMAND_ALIASES[args[UNNAMED_ARGUMENTS][0]] 
	?? args[UNNAMED_ARGUMENTS][0]
	?? COMMAND_DEFAULT;
const job = args[UNNAMED_ARGUMENTS][1] ?? await (async function getJobFromMapping( ) {
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

switch (command) {
case 'build': {
	console.log(`Starting job: ${bold(magenta(job))}`);
	await startJob(job).then(
		( ) => console.log(green('Job started successfully.')),
		(err: Error) => abort(`Request unsuccessful - ${err.message}`),
	);
	break;
}
case 'image': {
	const arg = (name: string) => typeof args[name] === 'string' ? args[name] as string
		: typeof args[name] === 'undefined' ? undefined
		: console.log(dim(`Argument "--${name}" must be a single string, ignoring it.`));

	const branch = arg('branch') ?? args[UNNAMED_ARGUMENTS][2] ?? await (async function getBranchFromGit( ) {
		console.log(dim('No branch specified - attempting to read from git.'));
		return await getCurrentBranchName(cwd).catch((err) => console.log(yellow('Failed to get branch from git:', err)));
	}( ));
	const number = Number(arg('build')) || Number(args[UNNAMED_ARGUMENTS][3]) || undefined;

	const name = `${bold(magenta(job))}/${magenta(branch)}${number ? `/${number}` : ''}`;
	console.log(`Getting docker build image: ${name}`);

	await getImage(job, { branch, number }).then(function onceSuccessful(image) {
		console.log(green('Successfully got docker build image:'));
		console.log(image);
	}).catch((err: Error) => abort(`Unsuccessful - ${err.message}`));
	break;
} 
case 'open': {
	const branch = args[UNNAMED_ARGUMENTS][2] ?? await (async function getBranchFromGit( ) {
		console.log(dim('No branch specified - attempting to read from git.'));
		return await getCurrentBranchName(cwd).catch((err) => console.log(yellow('Failed to get branch from git:', err)));
	}( ));
	const number = Number(args[UNNAMED_ARGUMENTS][3]) || undefined;

	const name = `${bold(magenta(job))}${branch ? `/${magenta(branch)}` : ''}${number ? `/${number}` : ''}`;
	console.log(`Opening job: ${name}`);

	const url = number ? getBuildURLAbsolute(job, branch, number)
		: branch ? getBranchURLAbsolute(job, branch)
		: getJobURLAbsolute(job);
	const open = Deno.run({
		cmd: [ 'open', url ],
		cwd: cwd,
		stdout: 'piped',
		stderr: 'piped',
	});
	const [ status, stdout, stderr ] = await Promise.all([
		open.status( ),
		open.output( ),
		open.stderrOutput( ),
	]);
	const decoder = new TextDecoder( );
	if (!status.success) abort(`Failed to open: ${decoder.decode(stderr).trim( )}`);
	else console.log(green('Successfully opened.'), decoder.decode(stdout).trim( ));
	break;
}
default: abort(`Unknown command "${command}".`);
}
