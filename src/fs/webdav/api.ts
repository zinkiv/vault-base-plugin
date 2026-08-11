import type { DAVResult } from 'webdav';
import type { StatModel } from '~/types';
import parseXML from '~/composable/parse-xml';
import { normalizeBaseDir, normalizeRemotePath } from '~/platform/path';
import { isNil } from '~/utils/fns';
import isRetryableError from '~/utils/is-retryable-error';
import logger from '~/utils/logger';
import requestUrl from '~/utils/request-url';
import sleep from '~/utils/sleep';

export class WebDavNotFoundError extends Error {
	name = 'WebDavNotFoundError';
	readonly res = { status: 404 };

	constructor(path: string) {
		super(`404: WebDAV path not found: ${path}`);
	}
}

export function isWebDavNotFoundError(error: unknown): boolean {
	if (!error || typeof error !== 'object') return false;
	const err = error as { message?: string; res?: { status?: number }; status?: number };
	if (err.res?.status === 404 || err.status === 404) return true;
	return (
		typeof err.message === 'string' &&
		(/^404\s*:/.test(err.message) || err.message.startsWith('WebDAV stat not found'))
	);
}

type WebDAVProp = {
	displayname?: string;
	resourcetype?: { collection?: unknown } | string;
	getlastmodified?: string | { '#text': string };
	getcontentlength?: string;
	getcontenttype?: string;
	getetag?: string | { '#text': string };
};

type WebDAVPropstat = {
	prop?: WebDAVProp;
	status?: string;
};

type WebDAVResponseItem = {
	href: string;
	propstat?: WebDAVPropstat | Array<WebDAVPropstat>;
};

function normalizePath(path: string) {
	return normalizeRemotePath(extractPathname(path));
}

function isSuccessStatus(status?: string): boolean {
	if (!status) return true;
	const match = /\s(?<code>\d{3})(?:\s|$)/.exec(status);
	if (!match) return false;
	const code = Number.parseInt(match.groups?.code ?? '', 10);
	return code >= 200 && code < 300;
}

function getValidProps(item: WebDAVResponseItem): WebDAVProp | undefined {
	if (!item.propstat) return undefined;

	const propstats = Array.isArray(item.propstat) ? item.propstat : [item.propstat];

	for (const propstat of propstats) {
		if (!isSuccessStatus(propstat.status)) continue;
		if (propstat.prop) return propstat.prop;
	}

	return undefined;
}

function isCollectionResource(resourcetype: WebDAVProp['resourcetype']): boolean {
	if (!resourcetype) return false;
	if (typeof resourcetype === 'string') return resourcetype.toLowerCase() === 'collection';
	return !isNil(resourcetype.collection);
}

function extractNextLink(linkHeader: string): string | undefined {
	const matches = /<(?<href>[^>]+)>;\s*rel="next"/.exec(linkHeader);
	return matches?.groups?.href;
}

function extractPathname(href: string): string {
	return decodeURIComponent(
		href.startsWith('http://') || href.startsWith('https://') ? new URL(href).pathname : href,
	);
}

function buildStripPrefixes(serverUrl: string): Array<string> {
	const endpointPath = extractPathname(serverUrl);
	return [endpointPath];
}

function buildDirectoryUrl(serverUrl: string, _path: string): string {
	const normalized = normalizeRemotePath(_path),
		path = normalized === '/' ? '/' : `${normalized}/`,
		encodedPath = path.split('/').map(encodeURIComponent).join('/');
	return `${serverUrl}${encodedPath}`;
}

function buildItemUrl(serverUrl: string, _path: string): string {
	const normalizedPath = normalizeRemotePath(_path),
		path =
			normalizedPath !== '/' && _path.endsWith('/') ? `${normalizedPath}/` : normalizedPath,
		encodedPath = path.split('/').map(encodeURIComponent).join('/');
	return `${serverUrl}${encodedPath}`;
}

function getItemHrefPath(stripPrefixes: Array<string>, item: WebDAVResponseItem): string {
	let path = normalizePath(item.href);
	for (const prefix of stripPrefixes)
		if (prefix !== '/' && path.startsWith(prefix)) {
			path = path.slice(prefix.length);
			break;
		}
	return path;
}

function isTargetCollectionMissing(
	items: Array<WebDAVResponseItem>,
	stripPrefixes: Array<string>,
	path: string,
): boolean {
	const target = normalizeRemotePath(path);
	for (const item of items) {
		if (normalizeRemotePath(getItemHrefPath(stripPrefixes, item)) !== target) continue;
		return !getValidProps(item);
	}
	return false;
}

function getStatusCode(error: unknown): number | undefined {
	if (!error || typeof error !== 'object') return;
	const err = error as { res?: { status?: number }; status?: number };
	if (typeof err.res?.status === 'number') return err.res.status;
	if (typeof err.status === 'number') return err.status;
}

function convertToFileStat(
	stripPrefixes: Array<string>,
	item: WebDAVResponseItem,
): { etag?: string; stat: StatModel } | undefined {
	const props = getValidProps(item);
	if (!props) return undefined;

	const isDir = isCollectionResource(props.resourcetype),
		path = getItemHrefPath(stripPrefixes, item),
		filename = isDir ? `${path}/` : path,
		lastModResp = props.getlastmodified,
		// Some servers return getlastmodified as { '#text': '...' } instead of a string.
		lastMod =
			typeof lastModResp === 'string'
				? lastModResp
				: typeof lastModResp === 'object'
					? lastModResp['#text']
					: '',
		etag =
			typeof props.getetag === 'string'
				? props.getetag
				: typeof props.getetag === 'object'
					? props.getetag['#text']
					: undefined;

	return {
		etag,
		stat: isDir
			? { isDir, path: filename }
			: {
					isDir,
					mtime: new Date(lastMod).valueOf(),
					path: filename,
					size: props.getcontentlength ? parseInt(props.getcontentlength) : 0,
				},
	};
}

const PROPFIND_BODY = `<?xml version="1.0" encoding="utf-8"?>
<propfind xmlns="DAV:">
	  <prop>
	    <displayname/>
	    <resourcetype/>
	    <getlastmodified/>
	    <getcontentlength/>
	    <getetag/>
	    <getcontenttype/>
	  </prop>
</propfind>`;

// oxlint-disable-next-line max-params
async function propfind(
	endpoint: string,
	token: string,
	url: string,
	depth: '0' | '1' | 'infinity',
	customHeaders: Record<string, string> = {},
) {
	let retries = 0;
	while (true)
		try {
			const response = await requestUrl({
					body: PROPFIND_BODY,
					headers: {
						...customHeaders,
						Authorization: `Basic ${token}`,
						'Content-Type': 'application/xml',
						Depth: depth,
					},
					method: 'PROPFIND',
					url,
				}),
				result: DAVResult = parseXML(response.text),
				stripPrefixes = buildStripPrefixes(endpoint).sort((a, b) => b.length - a.length),
				items = Array.isArray(result.multistatus.response)
					? result.multistatus.response
					: [result.multistatus.response];

			return {
				items,
				response,
				stripPrefixes,
			};
		} catch (error) {
			if (isRetryableError(error)) {
				retries++;
				if (retries > 3) throw error;
				logger.error('WebDAV connection error, retrying...', error);
				await sleep(5000);
				continue;
			}
			throw error;
		}
}

export async function getStat(
	endpoint: string,
	token: string,
	path: string,
	customHeaders: Record<string, string> = {},
): Promise<StatModel> {
	return (await getStatWithEtag(endpoint, token, path, customHeaders)).stat;
}

export async function getStatWithEtag(
	endpoint: string,
	token: string,
	path: string,
	customHeaders: Record<string, string> = {},
): Promise<{ etag?: string; stat: StatModel }> {
	const { items, stripPrefixes } = await propfind(
			endpoint,
			token,
			buildItemUrl(endpoint, path),
			'0',
			customHeaders,
		),
		normalizedTargetPath = normalizeRemotePath(path);

	for (const item of items) {
		const stat = convertToFileStat(stripPrefixes, item);
		if (!stat) continue;
		if (normalizeRemotePath(stat.stat.path) === normalizedTargetPath) return stat;
	}

	throw new WebDavNotFoundError(path);
}

// oxlint-disable-next-line max-params
export async function getDirectoryContents(
	endpoint: string,
	token: string,
	path: string,
	infinity = false,
	customHeaders: Record<string, string> = {},
): Promise<Array<StatModel>> {
	const contents: Array<StatModel> = [];
	let currentUrl = buildDirectoryUrl(endpoint, path),
		retries = 0;

	while (true)
		try {
			const { items, response, stripPrefixes } = await propfind(
				endpoint,
				token,
				currentUrl,
				infinity ? 'infinity' : '1',
				customHeaders,
			);

			if (isTargetCollectionMissing(items, stripPrefixes, path))
				throw new WebDavNotFoundError(path);

			const parsedItems = items
				.slice(1)
				.map((item) => convertToFileStat(stripPrefixes, item))
				.filter((item): item is { etag?: string; stat: StatModel } => item !== undefined)
				.map((item) => item.stat);

			contents.push(...parsedItems);

			const linkHeader = response.headers.link || response.headers.Link;
			if (!linkHeader) break;

			const nextLink = extractNextLink(linkHeader);
			if (!nextLink) break;
			const nextUrl = new URL(nextLink),
				pathName = normalizePath(nextUrl.pathname);
			nextUrl.pathname = `${pathName}/`;
			currentUrl = nextUrl.toString();
		} catch (error) {
			if (isRetryableError(error)) {
				retries++;
				if (retries > 3) throw error;
				logger.error('WebDAV connection error, retrying...', error);
				await sleep(5000);
				continue;
			}
			throw error;
		}

	return contents;
}

export async function remoteCollectionExists(
	endpoint: string,
	token: string,
	path: string,
	customHeaders: Record<string, string> = {},
): Promise<boolean> {
	try {
		const stat = await getStat(endpoint, token, path, customHeaders);
		if (!stat.isDir) throw new Error(`Remote path is a file, not a directory: ${path}`);
		return true;
	} catch (error) {
		if (isWebDavNotFoundError(error)) return false;
		throw error;
	}
}

async function mkcol(
	endpoint: string,
	token: string,
	path: string,
	customHeaders: Record<string, string> = {},
): Promise<void> {
	await requestUrl({
		headers: {
			...customHeaders,
			Authorization: `Basic ${token}`,
		},
		method: 'MKCOL',
		url: buildDirectoryUrl(endpoint, path),
	});
}

export async function createRemoteDirectories(
	endpoint: string,
	token: string,
	path: string,
	customHeaders: Record<string, string> = {},
): Promise<void> {
	const normalized = normalizeBaseDir(path);
	if (normalized === '/') return;

	const segments = normalized.split('/').filter(Boolean);
	let current = '/';
	for (const segment of segments) {
		current += `${segment}/`;
		if (await remoteCollectionExists(endpoint, token, current, customHeaders)) continue;
		try {
			await mkcol(endpoint, token, current, customHeaders);
		} catch (error) {
			if (getStatusCode(error) === 405) continue;
			throw error;
		}
	}
}
