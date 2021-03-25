#! /usr/bin/env deno run --allow-env --allow-net

import { required } from './common/env.ts';

const JENKINS_API_USER = await required('JENKINS_API_USER', 'Your Jenkins username.');
const JENKINS_API_TOKEN = await required('JENKINS_API_TOKEN', 'Your Jenkins API token - generate it on the settings page.');
const JENKINS_URL_BASE = await required('JENKINS_URL_BASE', 'Your Jenkins instance\'s base URL.');

const AUTH_FIELDS = `${JENKINS_API_USER}:${JENKINS_API_TOKEN}`;
const AUTH_HEADER = `Basic ${btoa(AUTH_FIELDS)}`;

const [ job ] = Deno.args;
if (!job) throw new Error('No job provided');
console.log(`Starting job: \x1b[1m${job}\x1b[0m`);

const urlJob = `${JENKINS_URL_BASE}/job/${job}/`;
const url = `${urlJob}build?delay=0`;
console.log(`\x1b[2m${url}\x1b[0m`);

const res = await fetch(url, {
	method: 'POST',
	redirect: 'manual',
	headers: { 'Authorization': AUTH_HEADER },
});
if (res.status !== 302) throw new Error(`Unexpected response code: ${res.status}`);
const urlRedirect = res.headers.get('location');
if (urlRedirect !== urlJob) throw new Error(`Unexpected redirect target: ${urlRedirect}`);

console.log('Job started successfully.');
