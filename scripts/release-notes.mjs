import { access, readFile, writeFile } from 'node:fs/promises';

const CHANGELOG_PATH = 'CHANGELOG.md',
	OUTPUT_PATH = 'release-notes.md';

function getSemVer(version) {
	const match = /(?<semver>\d+\.\d+\.\d+)/.exec(version);
	if (!match)
		throw new Error(`Invalid version format: ${version}. Expected semver (e.g., 1.0.0).`);

	return match.groups?.semver ?? '';
}

async function extractNotes(version) {
	await access(CHANGELOG_PATH);
	const lines = (await readFile(CHANGELOG_PATH, 'utf8')).split('\n'),
		targetSemVer = getSemVer(version);
	let found = false;
	const notes = [];

	for (const line of lines) {
		if (line.startsWith('## ')) {
			if (found) break;
			if (getSemVer(line) === targetSemVer) {
				found = true;
				continue;
			}
		}
		if (found) notes.push(line);
	}

	if (!found) throw new Error(`Release notes for version ${version} not found in CHANGELOG.md`);
	return notes.join('\n').trim();
}

const versionTag = process.argv[2];
if (!versionTag)
	throw new Error('Missing version argument. Usage: node scripts/release-notes.mjs <version>');

const notes = versionTag.includes('-')
	? 'Development release built for debug purpose, not recommended for real usage.'
	: await extractNotes(versionTag);
await writeFile(OUTPUT_PATH, `${notes}\n`);
console.log(`Wrote release notes to ${OUTPUT_PATH}`);
