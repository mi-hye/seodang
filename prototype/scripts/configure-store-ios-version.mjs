import { readFile, writeFile } from 'node:fs/promises';

// EAS's default version step assumes a flat Expo ios directory. Capacitor nests
// its Xcode project under ios/App, so update that project's build settings.
const buildNumber = process.argv[2];
if (!/^\d+$/.test(buildNumber ?? '')) throw new Error('A numeric EAS build number is required');
const { expo: { version } } = JSON.parse(await readFile('app.json', 'utf8'));
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Invalid store version');
const path = 'ios/App/App.xcodeproj/project.pbxproj';
const source = await readFile(path, 'utf8');
if (!source.includes('CURRENT_PROJECT_VERSION =') || !source.includes('MARKETING_VERSION =')) {
  throw new Error('Missing native version build settings');
}
await writeFile(path, source
  .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${buildNumber};`)
  .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`));
console.log(`Configured iOS ${version} (${buildNumber})`);
