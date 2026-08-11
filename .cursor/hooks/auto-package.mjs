import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd(),
	WATCH_PATHS = [
		'src',
		'manifest.json',
		'package.json',
		'tsdown.config.ts',
		'uno.config.ts',
		'scripts/package.mjs',
	];

async function readStdin() {
	const chunks = [];
	for await (const chunk of process.stdin) chunks.push(chunk);
	if (chunks.length === 0) return {};
	try {
		return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
	} catch {
		return {};
	}
}

function collectFiles(path) {
	const absolute = join(ROOT, path);
	if (!existsSync(absolute)) return [];
	const stats = statSync(absolute);
	if (stats.isFile()) return [absolute];

	const files = [];
	for (const entry of readdirSync(absolute, { recursive: true, withFileTypes: true })) {
		if (!entry.isFile()) continue;
		const parent = entry.parentPath ?? entry.path;
		files.push(join(parent, entry.name));
	}
	return files;
}

function newestMtime(paths) {
	let newest = 0;
	for (const path of paths)
		for (const file of collectFiles(path)) {
			const time = statSync(file).mtimeMs;
			if (time > newest) newest = time;
		}

	return newest;
}

function needsPackage() {
	const sourceTime = newestMtime(WATCH_PATHS);
	if (sourceTime === 0) return true;

	const releaseMain = join(ROOT, 'release', 'main.js');
	if (!existsSync(releaseMain)) return true;
	return sourceTime > statSync(releaseMain).mtimeMs;
}

function runPackage() {
	const result = spawnSync('npm', ['run', 'package'], {
			cwd: ROOT,
			encoding: 'utf8',
			shell: true,
			stdio: ['ignore', 'pipe', 'pipe'],
		}),
		output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
	if (output) console.error(output);
	return { code: result.status ?? 1, output };
}

function respond(payload) {
	process.stdout.write(`${JSON.stringify(payload)}\n`);
}

const event = await readStdin();
if (event.status === 'aborted') {
	respond({});
	process.exit(0);
}

if (!needsPackage()) {
	console.error('[auto-package] release/ 已是最新，跳过打包');
	respond({});
	process.exit(0);
}

console.error('[auto-package] 正在打包到 release/ …');
const { code, output } = runPackage();
if (code === 0) {
	console.error('[auto-package] 完成');
	respond({});
	process.exit(0);
}

const snippet = output.slice(-1200).replaceAll('`', "'");
respond({
	followup_message: `自动打包到 release/ 失败（exit ${code}）。请修复后继续：\n\n\`\`\`\n${snippet}\n\`\`\``,
});
process.exit(0);
