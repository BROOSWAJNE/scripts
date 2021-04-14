// Wrappers around the Jenkins API to deal with jobs

import { bold } from '../../common/colors.ts';

import {
	getAbsoluteURL,
	request,
} from './api.ts';

export const getJobURL = (job: string) => `job/${job}`;
export const getJobAbsoluteURL = (job: string) => getAbsoluteURL(getJobURL(job));

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
	const urlExpected = `${getJobAbsoluteURL(job)}/`;
	if (urlRedirect !== urlExpected) throw new Error(`Unexpected redirect: ${bold(urlRedirect)} (expected ${urlExpected})`);
}

