// Wrappers around Jira issues

import { request } from './api.ts';

export interface Issue {
	issueType: string;
	projectId: number;
	projectKey: string;
	summary: string;
	issueStatus: string;
	reporterKey: string;
	key: string;
	id: number;
}

export interface IssuePermissionsEntry {
	id: string;
	key: string;
	name: string;
	type: string;
	description: string;
	havePermission: boolean;
	deprecatedKey?: boolean;
}
export interface IssuePermissions {
	/** Ability to delete all worklogs made on issues. */
	DELETE_ALL_WORKLOGS: IssuePermissionsEntry;
	/** Ability to delete own worklogs made on issues. */
	DELETE_OWN_WORKLOGS: IssuePermissionsEntry;
	/** Ability to edit all worklogs made on issues. */
	EDIT_ALL_WORKLOGS: IssuePermissionsEntry;
	/** Ability to edit own worklogs made on issues. */
	EDIT_OWN_WORKLOGS: IssuePermissionsEntry;
	/** Allows you to log work on behalf of other users who have the Work on Issues permission for a given project. */
	PROJECT_LOG_WORK_FOR_OTHERS: IssuePermissionsEntry;
	/** Allows you to view all worklogs and expenses created for a project using Tempo. */
	PROJECT_VIEW_ALL_WORKLOGS: IssuePermissionsEntry;
	/** Ability to log work done against an issue. Only useful if Time Tracking is turned on. */
	WORK_ON_ISSUES: IssuePermissionsEntry;

	// ... add more permission keys as necessary
}

/** Fetches an issue by its id. */
export async function getIssue(issueId: number): Promise<Issue>;
/** Fetches an issue by its key. */
export async function getIssue(issueKey: string): Promise<Issue>;
export async function getIssue(issueIdOrKey: number | string): Promise<Issue> {
	const url = `rest/api/2/issue/${issueIdOrKey}`;
	const raw = await request(url, {
		method: 'GET',
	}).then(function handleError(res) {
		if (res.ok) return res;
		else throw new Error(res.statusText);
	}).then((res) => res.json( ));

	// TODO: fix types
	return {
		id: Number(raw.id),
		key: raw.key,
		summary: raw.fields.summary,
	} as Issue;
}

/** Gets the current user's permissions for the given issue. */
export async function getPermissions(issueKey: string): Promise<IssuePermissions> {
	const url = `rest/api/2/mypermissions?issueKey=${issueKey}`;
	const raw = await request(url, {
		method: 'GET',
	}).then(function handleError(res) {
		if (res.ok) return res;
		else throw new Error(res.statusText);
	}).then((res) => res.json( ));
	return raw.permissions;
}
