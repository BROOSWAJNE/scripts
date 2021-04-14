// Utilities for dealing with Date() objects

export const LOCALE = 'en-GB';

export const SEC_IN_MS = 1000;
export const MIN_IN_MS = 60 * SEC_IN_MS;
export const HOUR_IN_MS = 60 * MIN_IN_MS;
export const DAY_IN_MS = 24 * HOUR_IN_MS;
export const WEEK_IN_MS = 7 * DAY_IN_MS;

export const DAYS = [ 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday' ];
export const MONTHS = [
	'january',   'february', 'march',    'april',
	'may',       'june',     'july',     'august',
	'september', 'october',  'november', 'december',
];

export const getTimeOfDayString = (date: Date) => [
	date.getHours( ).toString( ).padStart(2, '0'),
	date.getMinutes( ).toString( ).padStart(2, '0'),
].join(':');
export const getDayOfWeek = (date: Date) => (date.getDay( ) + 6) % 7;
export const getDayOfWeekString = (date: Date) => DAYS[getDayOfWeek(date)];
export const getDayOfMonth = (date: Date) => date.getDate( );
export const getDayOfMonthString = (date: Date) => {
	const day = getDayOfMonth(date);
	if (day === 1) return '1st';
	if (day === 2) return '2nd';
	if (day === 3) return '3rd';
	if (day <= 20) return `${day}th`;
	const digit = day % 10;
	if (digit === 1) return `${day}st`;
	if (digit === 2) return `${day}nd`;
	if (digit === 3) return `${day}rd`;
	return `${day}th`;
}
export const getMonthString = (date: Date) => MONTHS[date.getMonth( )];

/** Formats a date as a pretty string. */
export function format(date: Date): string {
	const now = new Date( );
	const ago = Math.abs(now.getTime( ) - date.getTime( ));
	if (ago < MIN_IN_MS) return 'now';

	const isInThePast = date < now;
	if (ago < HOUR_IN_MS) {
		const minutes = Math.round(ago / MIN_IN_MS);
		const description = `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
		return isInThePast ? `${description} ago` : `in ${description}`;
	}
	if (ago < HOUR_IN_MS + MIN_IN_MS) return isInThePast ? '1 hour ago' : 'in 1 hour';

	const isToday = isInThePast
		? date.getTime( ) >= new Date(now).setHours(0, 0, 0, 0)
		: date.getTime( ) < new Date(now.getTime( ) + DAY_IN_MS).setHours(0, 0, 0, 0);
	if (isToday) return `today at ${getTimeOfDayString(date)}`;

	if (isInThePast) {
		const startOfYesterday = new Date(now.getTime( ) - DAY_IN_MS).setHours(0, 0, 0, 0);
		const isYesterday = date.getTime( ) >= startOfYesterday;
		if (isYesterday) return `yesterday at ${getTimeOfDayString(date)}`;
	} else {
		const endOfTomorrow = new Date(now.getTime( ) + 2 * DAY_IN_MS).setHours(0, 0, 0, 0);
		const isTomorrow = date.getTime( ) < endOfTomorrow;
		if (isTomorrow) return `tomorrow at ${getTimeOfDayString(date)}`;
	}

	const dayOfWeek = getDayOfWeek(now);
	const startOfWeek = new Date(now.getTime( ) - dayOfWeek * DAY_IN_MS).setHours(0, 0, 0, 0);
	const endOfWeek = new Date(now.getTime( ) + (7 - dayOfWeek) * DAY_IN_MS).setHours(0, 0, 0, 0);
	const isThisWeek = startOfWeek <= date.getTime( ) && date.getTime( ) < endOfWeek;
	if (isThisWeek) return `${getDayOfWeekString(date)} at ${getTimeOfDayString(date)}`;

	if (isInThePast) {
		const startOfLastWeek = new Date(startOfWeek - 7 * DAY_IN_MS);
		const isLastWeek = startOfLastWeek.getTime( ) <= date.getTime( );
		if (isLastWeek) return `last ${getDayOfWeekString(date)} at ${getTimeOfDayString(date)}`;
	} else {
		const endOfNextWeek = new Date(endOfWeek + 7 * DAY_IN_MS);
		const isNextWeek = date.getTime( ) < endOfNextWeek.getTime( );
		if (isNextWeek) return `next ${getDayOfWeekString(date)} at ${getTimeOfDayString(date)}`;
	}

	const startOfMonth = new Date(now);
	startOfMonth.setDate(1);
	startOfMonth.setHours(0, 0, 0, 0);
	const endOfMonth = new Date(now);
	endOfMonth.setMonth(endOfMonth.getMonth( ) + 1);
	endOfMonth.setDate(1);
	endOfMonth.setHours(0, 0, 0, 0);
	const isThisMonth = (startOfMonth <= date) && (date < endOfMonth);
	if (isThisMonth) return `${getDayOfWeekString(date)} ${getDayOfMonthString(date)} at ${getTimeOfDayString(date)}`; 

	const startOfYear = new Date(now);
	startOfYear.setMonth(0);
	startOfYear.setDate(1);
	startOfYear.setHours(0, 0, 0, 0);
	const endOfYear = new Date(now);
	endOfYear.setFullYear(endOfYear.getFullYear( ) + 1);
	endOfYear.setMonth(0);
	endOfYear.setDate(1);
	endOfYear.setHours(0, 0, 0, 0);
	const isThisYear = (startOfYear <= date) && (date < endOfYear);
	if (isThisYear) return `${getMonthString(date)} ${getDayOfMonthString(date)} at ${getTimeOfDayString(date)}`;

	return `${getMonthString(date)} ${getDayOfMonthString(date)} ${date.getFullYear( )} at ${getTimeOfDayString(date)}`;
}

