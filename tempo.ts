#! /usr/bin/env deno run --allow-run --allow-env --allow-net

import {
	DAY_IN_MS,
	SEC_IN_MS,
	WEEK_IN_MS,
	format,
} from './common/date.ts';
import {
	bold,
	cyan,
	dim,
	italic,
	magenta,
	yellow,
} from './common/colors.ts';
import {
	abort,
	prompt,
} from './common/io.ts';
import { parse } from './common/args.ts';

import {
	Issue as JiraIssue,
	IssuePermissions as JiraIssuePermissions,
	Worklog as TempoWorklog,
	addWorklog,
	getIssue,
	getPermissions,
	getWorklogs,
} from './apis/jira.ts';
import {
	Record as TimewRecord,
	iterateRecords,
} from './apis/timew.ts';

type TimewRecordCompleted = TimewRecord & { end: NonNullable<TimewRecord['end']> }

const RX_JIRA_TICKET = /^(?:CSD|INT)-\d+$/;
const USAGE = [
	`${bold('Usage')}: tempo.ts <...options>`,
	'Uploads timewarrior records to your jira tempo timesheet.',
	'',
	'Options:',
	`  ${cyan(bold('--from'))}    Date to begin uploading records from.`,
	`  ${cyan(bold('--until'))}   Date to upload records until.`,
	`  ${cyan(`${bold('--help')} -h`)} Prints this help message.`,
].join('\n');

const isCompleted = (record: TimewRecord): record is TimewRecordCompleted => record.end != null;
const linebreak = ( ) => console.log('');

// Parse command line arguments

const args = parse(Deno.args);
if (args['help'] || args['h']) (console.log(USAGE), Deno.exit(0));

// Get range to be submitted

const { until, from } = args;
if (until != null && typeof until !== 'string') abort(`Invalid value for ${bold('--until')} argument, expected a date`);
if (from != null && typeof from !== 'string') abort(`Invalid value from ${bold('--from')} argument, expected a date`);

const dateUntil = until != null ? new Date(until) : (function getCurrentDate( ) {
	console.log(yellow('No end date provided.'));
	const now = new Date( );
	console.log(dim('Defaulting to current time.'));
	return now;
})( );
if (until != null && Number.isNaN(dateUntil)) abort(`Invalid value for ${bold('--until')} argument, expected a date`);
linebreak( );

const dateBegin = from != null ? new Date(from) : await (async function getLastSubmissionDate( ) {
	console.log(yellow('No start date provided.'));
	console.log(dim('Defaulting to date of last submission.'));

	const intervals = {
		day: DAY_IN_MS,
		week: WEEK_IN_MS,
		month: 31 * DAY_IN_MS,
	};
	const unchecked = Object.keys(intervals)
		.sort((a, b) => intervals[b as keyof typeof intervals] - intervals[a as keyof typeof intervals]);

	let lastSubmittedWorklog: TempoWorklog | null = null;
	while (lastSubmittedWorklog == null && unchecked.length) {
		const interval = unchecked.pop( ) as keyof typeof intervals;
		const dateFrom = new Date(dateUntil.getTime( ) - intervals[interval]);

		console.log(dim(`Looking for worklogs submitted since ${bold(format(dateFrom))}`));
		const worklogs = await getWorklogs(dateFrom, dateUntil);
		if (!worklogs.length) continue;

		lastSubmittedWorklog = worklogs
			.sort((a: TempoWorklog, b: TempoWorklog) => a.started.getTime( ) - b.started.getTime( ))
			.pop( ) as TempoWorklog;
	}

	if (lastSubmittedWorklog == null) {
		const reason = `Unable to find any worklogs submitted before ${bold(dateUntil)}`;
		const solution = `please provide a ${bold('--from')} date`;
		abort(`${reason}, ${solution}`);
	}
	
	const lastSubmittedIssue = lastSubmittedWorklog.issue.key;
	const lastSubmittedStart = lastSubmittedWorklog.started;
	const lastSubmittedDuration = lastSubmittedWorklog.timeSpentSeconds * SEC_IN_MS;
	const lastSubmittedFinished = new Date(lastSubmittedStart.getTime( ) + lastSubmittedDuration);
	console.log(dim(`Last submission: ${bold(lastSubmittedIssue)} (${format(lastSubmittedStart)} -> ${format(lastSubmittedFinished)})`));
	return lastSubmittedFinished;
})( );
if (from != null && Number.isNaN(dateBegin)) abort(`Invalid value for ${bold('--from')} argument, expected a date`);
linebreak( );

/** Checks if the given record is in the time range to be submitted to Tempo. */
const isInRange = (record: TimewRecordCompleted) => record.start >= dateBegin && record.end <= dateUntil;

// Get any existing records in that range, so we avoid conflicts

console.log(`Checking for existing submissions in range: ${magenta(format(dateBegin))} -> ${magenta(format(dateUntil))}`);
const existing = await getWorklogs(dateBegin, dateUntil);
console.log(`Existing submissions found: ${bold(cyan(existing.length))}`);
for (const worklog of existing) {
	const worklogDuration = worklog.timeSpentSeconds * SEC_IN_MS;
	const worklogFinished = new Date(worklog.started.getTime( ) * worklogDuration);
	console.log(dim(`${worklog.issue.key}: ${italic(format(worklog.started))} -> ${italic(format(worklogFinished))}`));
}
linebreak( );

/** Checks if the given record conflicts with an existing worklog. */
const findConflict = (record: TimewRecordCompleted) => existing.find(function isConflictingWith(worklog) {
	if (worklog.started > record.end) return false;

	const worklogDuration = worklog.timeSpentSeconds * SEC_IN_MS;
	const worklogFinished = worklog.started.getTime( ) + worklogDuration;
	return record.start.getTime( ) <= worklogFinished;
});

// Work through and submit timewarrior records

console.log(`Submitting range: ${magenta(format(dateBegin))} -> ${magenta(format(dateUntil))}.`);

let numRecordsIgnored = 0;
function resetIgnoredCount( ) {
	if (numRecordsIgnored > 0) console.log(dim(`Ignored ${bold(numRecordsIgnored)} timewarrior record(s).`));
	numRecordsIgnored = 0;
}

const issues = new Map<string, JiraIssue>( );
const permissions = new Map<string, JiraIssuePermissions>( );

for await (const record of iterateRecords( )) {
	// ignore currently ongoing record
	if (!isCompleted(record)) {
		numRecordsIgnored += 1;
		continue;
	}

	// ignore record outside wanted range
	if (!isInRange(record)) {
		numRecordsIgnored += 1;
		continue;
	}

	linebreak( );
	const recordIdent = bold(`@${record.id}`);
	const recordRange = `${magenta(format(record.start))} -> ${magenta(format(record.end))}`;
	const recordTags = record.tags.map((tag) => italic(cyan(tag))).join(', ');

	// ignore record conflicting with existing worklog
	const conflict = findConflict(record);
	if (conflict != null) {
		console.log(`${recordIdent} - ${recordRange}: ${recordTags}`);
		const finished = new Date(conflict.started.getTime( ) + conflict.timeSpentSeconds * SEC_IN_MS);
		const existing = `${bold(conflict.issue.key)} (${italic(format(conflict.started))} -> ${italic(format(finished))})`;
		console.log(`Ignoring - conflicts with existing worklog: ${existing}`);
		numRecordsIgnored += 1;
		continue;
	}

	resetIgnoredCount( );
	console.log(`${recordIdent} - ${recordRange}: ${recordTags}`);

	const ticket = record.tags.find((tag) => RX_JIRA_TICKET.test(tag)) ?? await (async function promptForTicket( ) {
		const ticket = await prompt([
			`No ticket id found within the tags for record ${recordIdent}.`,
			`Tags: ${recordTags}`,
			'Please provide a valid ticket ID: ',
		].join('\n'));
		return ticket.toUpperCase( );
	})( );
	if (ticket == null || !RX_JIRA_TICKET.test(ticket)) {
		console.log(yellow('No ticket matched to record.'));
		continue;
	}

	console.log(`Checking permissions for issue: ${bold(ticket)}`);

	// TODO: handle issue not found
	const issue = issues.get(ticket) ?? await getIssue(ticket);
	issues.set(ticket, issue);

	const permission = permissions.get(ticket) ?? await getPermissions(ticket);
	permissions.set(ticket, permission);

	const { WORK_ON_ISSUES } = permission;
	if (!WORK_ON_ISSUES.havePermission) throw new Error(`No work permissions for issue ${issue.key}`);

	console.log(`Submitting under issue: ${bold(issue.key)} (${italic(issue.summary)})`);

	await addWorklog({
		from: record.start,
		to: record.end,
		issue: issue,
	});
}
linebreak( );
resetIgnoredCount( );
