import type VaultHubPlugin from '~';
import waitUntil from '~/utils/wait-until';

let pluginInstance: VaultHubPlugin | undefined;

export function setPluginInstance(plugin?: VaultHubPlugin) {
	pluginInstance = plugin;
}

export async function usePlugin() {
	await waitUntilPluginInstance();
	return pluginInstance as VaultHubPlugin;
}

function waitUntilPluginInstance() {
	return waitUntil(() => Boolean(pluginInstance), 100);
}

export async function useSettings() {
	await waitUntilPluginInstance();
	return (pluginInstance as VaultHubPlugin).settings;
}
