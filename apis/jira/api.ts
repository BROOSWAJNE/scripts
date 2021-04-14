// Wrappers around the Jira API

import { dim } from '../../common/colors.ts';
import { required } from '../../common/env.ts';

export const JIRA_USERNAME = await required('JIRA_USERNAME', 'Your Jira login username.');
export const JIRA_PASSWORD = await required('JIRA_PASSWORD', 'Your Jira login password.');
export const JIRA_URL_BASE = await required('JIRA_URL_BASE', 'Your Jira instance\'s base URL.');

export const AUTH_FIELDS = `${JIRA_USERNAME}:${JIRA_PASSWORD}`;
export const AUTH_HEADER = `Basic ${btoa(AUTH_FIELDS)}`;

/** Gets the full url to a given Jira resource, given its relative path. */
export function getAbsoluteURL(url: string) {
	// TODO: better url joining
	return `${JIRA_URL_BASE}/${url}`;
}
/** Makes a call to the Jira api, at the given relative URL. */
export function request(url: string, options: RequestInit = { }) {
	const requestURL = getAbsoluteURL(url);
	const requestMethod = options.method ?? 'GET';
	console.log(dim(`${requestMethod} ${requestURL}`));
	return fetch(requestURL, { ...options, headers: {
		'Authorization': AUTH_HEADER,
		...options.headers,
	}});
}

