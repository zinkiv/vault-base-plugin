import type VaultHubPlugin from '~';

export default function getCredential(plugin: VaultHubPlugin): string {
	const credential = plugin.app.secretStorage.getSecret(plugin.settings.token);
	if (!credential) throw new Error('Failed to retrieve WebDAV credential!');
	return credential;
}
