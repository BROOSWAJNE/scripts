export async function getCurrentBranchName(repo: string = Deno.cwd( )): Promise<string> {
	const git = Deno.run({
		cmd: [ 'git', 'symbolic-ref', 'HEAD', '--short' ],
		cwd: repo,
		stdout: 'piped',
		stderr: 'piped',
	});
	const [ status, stdout, stderr ] = await Promise.all([
		git.status( ),
		git.output( ),
		git.stderrOutput( ),
	]);

	const decoder = new TextDecoder( );
	if (!status.success) {
		const message = decoder.decode(stderr).trim( ) || `command exited with status ${status.code}`;
		throw new Error(`Failed to get branch from git: ${message}`);
	}

	return decoder.decode(stdout).trim( );
}
