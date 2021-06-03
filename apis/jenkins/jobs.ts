// Wrappers around the Jenkins API to deal with jobs

import { bold } from '../../common/colors.ts';

import {
	getURLAbsolute,
	request,
} from './api.ts';

export const getJobURL = (job: string) => `job/${encodeURIComponent(job)}`;
export const getJobURLAbsolute = (job: string) => getURLAbsolute(getJobURL(job));

export const getBranchURL = (job: string, branch: string) => `${getJobURL(job)}/job/${encodeURIComponent(branch)}`;
export const getBranchURLAbsolute = (job: string, branch: string) => getURLAbsolute(getBranchURL(job, branch));

export const getBuildURL = (
	job: string, 
	branch: string, 
	number: number,
) => `${getBranchURL(job, branch)}/${number}`;
export const getBuildURLAbsolute = (
	job: string,
	branch: string,
	number: number,
) => getURLAbsolute(getBuildURL(job, branch, number));

async function getLatestBuildNumber(job: string, branch: string): Promise<number> {
	const url = `${getBranchURL(job, branch)}/api/json`;
	const res = await request(url, { method: 'GET' });
	const { lastBuild } = await res.json( );
	return lastBuild.number;
}

/** Starts a build command for the given job. */
export async function startJob(job: string) {
	const url = `${getJobURL(job)}/build?delay=0`;

	const res = await request(url, {
		method: 'POST',
		redirect: 'manual',
	});

	// if successful, we get redirected to the full job url
	if (res.status !== 302) throw new Error(`Unexpected response code: ${bold(res.status)}`);
	const urlRedirect = res.headers.get('location');
	const urlExpected = `${getJobURLAbsolute(job)}/`;
	if (urlRedirect !== urlExpected) throw new Error(`Unexpected redirect: ${bold(urlRedirect)} (expected ${urlExpected})`);
}

/** Gets the docker build image for the given job. */
export async function getImage(job: string, { branch, number }: {
	branch?: string;
	number?: number;
}): Promise<string> {
	if (!branch) branch = 'master';
	if (!number) number = await getLatestBuildNumber(job, branch);

	const url = `${getBuildURL(job, branch, number)}/consoleText`;
	const res = await request(url, { method: 'GET' });
	const output = await res.text( );

	const pushes = output.split('\n').filter((line) => line.startsWith('+ docker push'));
	if (pushes.length < 2) throw new Error(`${job}/${branch}/${number} not pushed yet`);
	if (pushes.length > 2) throw new Error(`${job}/${branch}/${number} has more than 2 pushes!`);

	return pushes[1].slice('+ docker push '.length);
}
