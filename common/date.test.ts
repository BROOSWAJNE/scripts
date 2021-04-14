import {
	MIN_IN_MS,
	HOUR_IN_MS,
	DAY_IN_MS,
	format,
} from './date.ts';

Deno.test('format', function( ) {

	// stub date constructor to always be at the same time regardless of when the test is being run

	const Date = globalThis.Date;
	const now = new Date('1996-07-15T12:00');
	// @ts-ignore -- doing sum stubbin
	globalThis.Date = Object.assign(function TestDateConstructor(...args: ConstructorParameters<DateConstructor>) {
		if (!new.target) return Date( );
		// @ts-ignore -- ts u dum
		const isNow = args.length === 0;
		if (isNow) return new Date(now);
		// explicitly defined, let it happen
		else return new Date(...args);
	}, {
		UTC: Date.UTC,
		parse: Date.parse,
		now: ( ) => now.getTime( ),
	});

	// test helpers

	const encoder = new TextEncoder( );
	const text = (str: string) => encoder.encode(str);
	function test(date: Date, expected: string) {
		const time = date.toISOString( );
		const test = `\x1b[2mTest:\x1b[0m ${time} -> "${expected}"`;
		Deno.writeAllSync(Deno.stdout, text(test));

		const formatted = format(date);
		const pass = formatted === expected;
		const icon = pass ? '\x1b[32m✓' : `\x1b[31m✗ "${formatted}"`;
		Deno.writeAllSync(Deno.stdout, text(`\x1b[2K\x1b[0G${test} ${icon}\x1b[0m\n`));

		if (pass) return;
		const message = `Expected ${time} to be formatted as "${expected}", got "${formatted}"`;
		throw new Error(message);
	}
	const offset = (ms: number) => new Date(now.getTime( ) + ms);

	// tests

	// now
	test(now, 'now');

	// a few minutes away
	test(offset(- MIN_IN_MS), '1 minute ago');
	test(offset(+ MIN_IN_MS), 'in 1 minute');
	test(offset(- 3 * MIN_IN_MS), '3 minutes ago');
	test(offset(+ 3 * MIN_IN_MS), 'in 3 minutes');
	test(offset(- 59 * MIN_IN_MS), '59 minutes ago');
	test(offset(+ 59 * MIN_IN_MS), 'in 59 minutes');

	// exactly an hour away
	test(offset(- HOUR_IN_MS), '1 hour ago');
	test(offset(+ HOUR_IN_MS), 'in 1 hour');

	// more than 1 hour away
	test(offset(- HOUR_IN_MS - MIN_IN_MS), 'today at 10:59');
	test(offset(+ HOUR_IN_MS + MIN_IN_MS), 'today at 13:01');
	// extremes
	test(offset(- 12 * HOUR_IN_MS), 'today at 00:00');
	test(offset(+ 11 * HOUR_IN_MS + 59 * MIN_IN_MS), 'today at 23:59');

	// one day away
	test(offset(- DAY_IN_MS), 'yesterday at 12:00');
	test(offset(+ DAY_IN_MS), 'tomorrow at 12:00');
	// extremes
	test(offset(+ 12 * HOUR_IN_MS), 'tomorrow at 00:00');
	test(offset(- DAY_IN_MS - 12 * HOUR_IN_MS), 'yesterday at 00:00');
	test(offset(+ DAY_IN_MS + 11 * HOUR_IN_MS + 59 * MIN_IN_MS), 'tomorrow at 23:59');

	// this week
	test(offset(+ 2 * DAY_IN_MS), 'wednesday at 12:00');
	test(offset(+ 3 * DAY_IN_MS), 'thursday at 12:00');
	test(offset(+ 4 * DAY_IN_MS), 'friday at 12:00');
	test(offset(+ 5 * DAY_IN_MS), 'saturday at 12:00');
	test(offset(+ 6 * DAY_IN_MS), 'sunday at 12:00');
	// extremes
	test(offset(+ DAY_IN_MS + 12 * HOUR_IN_MS), 'wednesday at 00:00');
	test(offset(+ 2 * DAY_IN_MS + 12 * HOUR_IN_MS), 'thursday at 00:00')
	test(offset(+ 3 * DAY_IN_MS + 12 * HOUR_IN_MS), 'friday at 00:00');
	test(offset(+ 4 * DAY_IN_MS + 12 * HOUR_IN_MS), 'saturday at 00:00');
	test(offset(+ 5 * DAY_IN_MS + 12 * HOUR_IN_MS), 'sunday at 00:00');
	test(offset(+ 6 * DAY_IN_MS + 11 * HOUR_IN_MS + 59 * MIN_IN_MS), 'sunday at 23:59');

	// one week away - backwards
	test(offset(- 2 * DAY_IN_MS), 'last saturday at 12:00');
	test(offset(- 3 * DAY_IN_MS), 'last friday at 12:00');
	test(offset(- 4 * DAY_IN_MS), 'last thursday at 12:00');
	test(offset(- 5 * DAY_IN_MS), 'last wednesday at 12:00');
	test(offset(- 6 * DAY_IN_MS), 'last tuesday at 12:00');
	test(offset(- 7 * DAY_IN_MS), 'last monday at 12:00');
	// one week away - forwards
	test(offset(+ 7 * DAY_IN_MS), 'next monday at 12:00');
	test(offset(+ 8 * DAY_IN_MS), 'next tuesday at 12:00');
	test(offset(+ 9 * DAY_IN_MS), 'next wednesday at 12:00');
	test(offset(+ 10 * DAY_IN_MS), 'next thursday at 12:00');
	test(offset(+ 11 * DAY_IN_MS), 'next friday at 12:00');
	test(offset(+ 12 * DAY_IN_MS), 'next saturday at 12:00');
	test(offset(+ 13 * DAY_IN_MS), 'next sunday at 12:00');
	// extremes
	test(offset(- 7 * DAY_IN_MS - 12 * HOUR_IN_MS), 'last monday at 00:00');
	test(offset(+ 13 * DAY_IN_MS + 11 * HOUR_IN_MS + 59 * MIN_IN_MS), 'next sunday at 23:59');

	// this month
	test(offset(- 8 * DAY_IN_MS), 'sunday 7th at 12:00');
	test(offset(- 14 * DAY_IN_MS - 12 * HOUR_IN_MS), 'monday 1st at 00:00');
	test(offset(+ 16 * DAY_IN_MS + 11 * HOUR_IN_MS + 59 * MIN_IN_MS), 'wednesday 31st at 23:59');

	// this year
	test(new Date('1996-02-18T12:00'), 'february 18th at 12:00');
	test(new Date('1996-01-01T00:00'), 'january 1st at 00:00');
	test(new Date('1996-12-31T23:59'), 'december 31st at 23:59');

	// any time
	test(new Date('2021-04-01T16:56'), 'april 1st 2021 at 16:56');

	globalThis.Date = Date;

});
