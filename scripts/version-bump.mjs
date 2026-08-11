import { readFile, writeFile } from 'node:fs/promises';

const targetVersion = process.env.npm_package_version ?? '0.2.0',
	manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
manifest.version = targetVersion;
await writeFile('manifest.json', `${JSON.stringify(manifest, undefined, '\t')}\n`);

const versions = JSON.parse(await readFile('versions.json', 'utf8'));
versions[targetVersion] = manifest.minAppVersion;
await writeFile('versions.json', `${JSON.stringify(versions, undefined, '\t')}\n`);

const constsPath = 'src/consts.ts',
	consts = await readFile(constsPath, 'utf8');
await writeFile(
	constsPath,
	consts.replace(/export const VERSION = '[^']+';/, `export const VERSION = '${targetVersion}';`),
);

console.log(`Bumped version to ${targetVersion}`);
