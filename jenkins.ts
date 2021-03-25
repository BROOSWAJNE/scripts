#! /usr/bin/env deno run --allow-env --allow-net

const JENKINS_API_USER = Deno.env.get('JENKINS_API_USER');
const JENKINS_API_TOKEN = Deno.env.get('JENKINS_API_TOKEN');
const JENKINS_URL_BASE = Deno.env.get('JENKINS_URL_BASE');
if (!JENKINS_API_USER) throw new Error('Jenkins api user not defined');
if (!JENKINS_API_TOKEN) throw new Error('Jenkins api token not defined');
if (!JENKINS_URL_BASE) throw new Error('Jenkins base url not defined');

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
