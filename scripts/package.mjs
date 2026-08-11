import { copyFile, mkdir, readFile, rm } from 'node:fs/promises';

const manifest = JSON.parse(await readFile('manifest.json', 'utf8')),
	packageJson = JSON.parse(await readFile('package.json', 'utf8')),
	versions = JSON.parse(await readFile('versions.json', 'utf8'));

if (manifest.version !== packageJson.version)
	throw new Error('manifest.json 与 package.json 版本不一致');

if (versions[manifest.version] !== manifest.minAppVersion)
	throw new Error('versions.json 缺少当前版本或最低 Obsidian 版本不一致');

await rm('release', { force: true, recursive: true });
await mkdir('release', { recursive: true });
await mkdir('dist', { recursive: true });
await copyFile('dist/main.js', 'release/main.js');
await copyFile('manifest.json', 'release/manifest.json');
await copyFile('manifest.json', 'dist/manifest.json');
try {
	await copyFile('dist/styles.css', 'release/styles.css');
} catch {
	// Styles.css is optional if CSS extraction is empty
}

console.log(`Obsidian 发布产物已生成：release/ (${manifest.version})`);
