#! /usr/bin/env deno run --allow-env --allow-net

import {
	UNNAMED_ARGUMENTS,
	parse,
} from './common/args.ts';
import {
	bold,
	green,
	magenta,
	red,
	dim,
} from './common/colors.ts';
import { required } from './common/env.ts';

const JENKINS_API_USER = await required('JENKINS_API_USER', 'Your Jenkins username.');
const JENKINS_API_TOKEN = await required('JENKINS_API_TOKEN', 'Your Jenkins API token - generate it on the settings page.');
const JENKINS_URL_BASE = await required('JENKINS_URL_BASE', 'Your Jenkins instance\'s base URL.');

const AUTH_FIELDS = `${JENKINS_API_USER}:${JENKINS_API_TOKEN}`;
const AUTH_HEADER = `Basic ${btoa(AUTH_FIELDS)}`;

const abort = (reason: string) => (console.log(red(reason)), Deno.exit(1));

const args = parse(Deno.args);
const [ job ] = args[UNNAMED_ARGUMENTS];
if (!job) abort('No job specified');

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
