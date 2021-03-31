// Wrappers around the Jenkins API

import { dim } from '../common/colors.ts';
import { required } from '../common/env.ts';

export const JENKINS_API_USER = await required('JENKINS_API_USER', 'Your Jenkins username.');
export const JENKINS_API_TOKEN = await required('JENKINS_API_TOKEN', 'Your Jenkins API token - generate it on the settings page.');
export const JENKINS_URL_BASE = await required('JENKINS_URL_BASE', 'Your Jenkins instance\'s base URL.');

export const AUTH_FIELDS = `${JENKINS_API_USER}:${JENKINS_API_TOKEN}`;
export const AUTH_HEADER = `Basic ${btoa(AUTH_FIELDS)}`;

/** Gets the full url to a given Jenkins resource, given its relative path. */
export function getAbsoluteURL(url: string) {
	// TODO: better url joining
	return `${JENKINS_URL_BASE}/${url}`;
}
/** Makes a call to the Jenkins api, at the given relative URL. */
export function request(url: string, options: RequestInit = { }) {
	const requestURL = getAbsoluteURL(url);
	const requestMethod = options.method ?? 'GET';
	console.log(dim(`${requestMethod} ${requestURL}`));
	return fetch(requestURL, { ...options, headers: {
		'Authorization': AUTH_HEADER,
		...options.headers,
	}});
}
