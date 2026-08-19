# src/services/

## Responsibility

Service-layer orchestration for sync lifecycle, scheduling, WebDAV client creation, runtime observability, and command registration.

## Design

- `SyncSchedulerService` batches sync requests, deduplicates triggers, and delays execution until the plugin is idle.
- `SyncExecutorService` owns the actual sync run: prepare keys, build `SyncEngine`, plan tasks, update run snapshots, and finalize outcomes.
- `ObservabilityService` subscribes to `syncRun` state and reflects it in the status bar and notices.
- `WebDAVService` creates authenticated WebDAV clients and wraps them with a rate-limited proxy.
- `command.setup.ts` registers Obsidian commands that delegate to the sync workflow.

## Flow

1. Startup enables vault change listeners after the workspace is ready, then optional startup/interval sync timers in the scheduler. Startup sync waits for layout ready so it does not run against an incomplete vault.
2. File events are filtered by glob rules; matching changes enqueue a sync request.
3. Pending requests are flushed into a single execution request with merged trigger/source metadata.
4. The executor waits for the plugin to be idle, then creates the WebDAV client, prepares encryption keys, and starts `SyncEngine` planning/execution.
5. Planning and execution publish incremental snapshots through the shared sync event store.
6. Observability reacts to each snapshot to update status-bar text, ribbon state, and notices.
7. Commands trigger manual sync or cancel an active run.

## Integration

- Depends on plugin state/settings, vault/workspace events, and Obsidian UI primitives (`Notice`, status bar).
- Uses shared sync events (`syncRun`, snapshot builders, cancellation/finalization helpers) as the coordination channel between scheduler, executor, and observability.
- Delegates file synchronization to `SyncEngine` and WebDAV transport to `webdav` via `createClient`.
- Uses shared utilities for logging, i18n, credential access, timing, glob matching, manual sync launch, and API rate limiting.
