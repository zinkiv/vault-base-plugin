import type { SyncTrigger } from '~/events';

export default function shouldKeepRemoteOnAutoSync(
	trigger: SyncTrigger,
	localFileCount: number,
): boolean {
	if (trigger === 'manual') return false;
	if (trigger === 'startup') return true;
	return localFileCount === 0;
}
