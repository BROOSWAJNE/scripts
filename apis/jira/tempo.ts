// Wrappers around the Jira Tempo plugin API

import { SEC_IN_MS } from '../../common/date.ts';

import {
	JIRA_USERNAME,
	request,
} from './api.ts';
import { Issue } from './issue.ts';

// See https://www.tempo.io/server-api-documentation/timesheets

export const enum WorklogType {
	ISSUE = 'ISSUE',
	LOCATION = 'LOCATION',
	ACCOUNT_APPROVAL = 'ACCOUNT_APPROVAL',
}

export interface WorklogsSearchOptions {
	accountId: number[];
	accountKey: string[];
	categoryId: number[];
	categoryTypeId: number[];
	customerId: number[];
	epicKey: string[];
	filterId: number[];
	include: WorklogType[];
	includeSubtasks: boolean;
	locationId: number[];
	projectId: number[];
	projectKey: string[];
	roleId: number[];
	taskId: number[];
	taskKey: string[];
	teamId: number[];
}

export interface Worklog {
	// TODO: define interfaces for object types
	attributes: Record<string, unknown>;
	billableSeconds: number;
	comment: string;
	dateCreated: Date;
	dateUpdated: Date;
	issue: Issue;
	location: Record<string, unknown>;
	originId: number;
	originTaskId: number;
	started: Date;
	tempoWorklogId: number;
	timeSpent: string;
	timeSpentSeconds: number;
	updater: string;
	worker: string;
}
interface WorklogRaw extends Omit<Worklog, 'dateCreated' | 'dateUpdated' | 'started'> {
	dateCreated: string;
	dateUpdated: string;
	started: string;
}

export async function getWorklogs(
	from: Date, 
	to: Date, 
	options?: WorklogsSearchOptions,
): Promise<Worklog[]> {
	const url = 'rest/tempo-timesheets/4/worklogs/search';
	const raw: WorklogRaw[] = await request(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			...options, 
			// tempo wants the day, not the full date and time
			from: from.toISOString( ).slice(0, 'YYYY-MM-DD'.length),
			to: to.toISOString( ).slice(0, 'YYYY-MM-DD'.length),
		}),
	}).then((res) => res.json( ));
	return raw.map((log) => ({
		...log,
		dateCreated: new Date(log.dateCreated),
		dateUpdated: new Date(log.dateUpdated),
		started: new Date(log.started),
	}));
}

export async function addWorklog({ from, to, issue }: {
	from: Date;
	to: Date;
	issue: Issue;
}): Promise<Worklog[]> {
	const time = to.getTime( ) - from.getTime( );
	const secs = time / SEC_IN_MS;
	const url = 'rest/tempo-timesheets/4/worklogs';

	const raw: WorklogRaw[] = await request(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			attributes: { },
			billableSeconds: null,
			comment: null,
			endDate: null,
			includeNonWorkingDays: false,
			originId: -1,
			originTaskId: issue.id,
			remainingEstimate: null,
			started: from.toISOString( ),
			timeSpentSeconds: secs,
			worker: JIRA_USERNAME,
		}),
	}).then(function handleError(res) {
		if (res.ok) return res;
		else throw new Error(res.statusText);
	}).then((res) => res.json( ));

	return raw.map((log) => ({
		...log,
		dateCreated: new Date(log.dateCreated),
		dateUpdated: new Date(log.dateUpdated),
		started: new Date(log.started),
	}));
}
