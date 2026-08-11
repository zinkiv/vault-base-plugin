import formatDateTime from '~/utils/format-date';
import { isNil } from './fns';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

type LogValue = string | number | boolean | null | Array<LogValue> | { [key: string]: LogValue };

export type LogEntry = {
	timestamp: string;
	timestampMs: number;
	level: LogLevel;
	message: string;
	runId?: string;
	metadata?: LogValue;
};

const MAX_LOG_ENTRIES = 1000;

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeLogValue(value: unknown, depth = 0): LogValue | undefined {
	if (isNil(value)) return;
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
		return value;

	if (value instanceof Error)
		return sanitizeLogValue(
			{ message: value.message, name: value.name, stack: value.stack },
			depth + 1,
		);

	if (Array.isArray(value)) {
		if (depth >= 4) return value.map((item) => String(item));
		return value
			.map((item) => sanitizeLogValue(item, depth + 1))
			.filter((item): item is LogValue => item !== undefined);
	}

	if (isPlainObject(value)) {
		if (depth >= 4) return '[truncated metadata]';
		const sanitizedObject: Record<string, LogValue> = {};
		for (const [key, entryValue] of Object.entries(value)) {
			const sanitizedValue = sanitizeLogValue(entryValue, depth + 1);
			if (sanitizedValue !== undefined) sanitizedObject[key] = sanitizedValue;
		}
		return sanitizedObject;
	}

	return JSON.stringify(value) ?? '[unserializable metadata]';
}

class Logger {
	private readonly logs: Array<LogEntry> = [];
	private readonly contextStack: Array<string> = [];

	pushRunId(context: string) {
		this.contextStack.push(context);
	}

	popRunId() {
		this.contextStack.pop();
	}

	info(message: string, metadata?: unknown) {
		this.write({ level: 'info', message, metadata });
	}

	warn(message: string, metadata?: unknown) {
		this.write({ level: 'warn', message, metadata });
	}

	error(message: string, metadata?: unknown) {
		this.write({ level: 'error', message, metadata });
	}

	debug(message: string, metadata?: unknown) {
		this.write({ level: 'debug', message, metadata });
	}

	private write({
		level,
		message,
		metadata,
	}: {
		level: LogLevel;
		message: string;
		metadata?: unknown;
	}) {
		const timestampMs = Date.now(),
			entry: LogEntry = {
				level,
				message,
				metadata: sanitizeLogValue(metadata),
				runId: this.currentId,
				timestamp: formatDateTime(timestampMs),
				timestampMs,
			};

		this.logs.push(entry);
		if (this.logs.length > MAX_LOG_ENTRIES)
			this.logs.splice(0, this.logs.length - MAX_LOG_ENTRIES);
	}

	private get currentId() {
		return this.contextStack.at(-1) ?? '';
	}
}

const logger = new Logger();
export default logger;
