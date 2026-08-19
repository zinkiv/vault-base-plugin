# src/sync/

## Responsibility

- Owns the sync engine that compares local vault state, remote WebDAV state, and persisted sync records.
- Turns state differences into executable tasks, then runs them with retry, cancellation, progress, and confirmation handling.
- Keeps record metadata aligned with file operations so later sync rounds can detect changes and conflicts.

## Design

- `SyncEngine` coordinates plan preparation, task optimization, execution, and final run snapshot updates.
- `TwoWaySyncDecider` is the decision layer; it classifies paths into file, folder, and file-vs-folder cases and emits task objects through a task factory.
- Tasks are small command objects (`BaseTask`) that encapsulate one mutation and return a structured success/failure result.
- `optimizeTasks()` groups and reorders tasks to improve throughput: merges removals, sorts mkdirs by depth, and batches push/pull work by chunk and bandwidth limits.
- Errors are normalized into `TaskError`, `SyncCancelledError`, and `SyncRetryExhaustedError` so the engine can report consistent failure state.

## Flow

1. `SyncEngine.preparePlan()` creates a `SyncRecord`, ensures the remote base directory exists when the local vault has files, then asks `TwoWaySyncDecider` for a task list. An empty local vault does not create a missing remote folder.
2. The decider loads records, walks local vault state, gets remote state, applies conflict/change rules, and produces tasks such as push, pull, merge, mkdir, remove, add-record, and clean-record.
3. `SyncEngine.start()` stores plan summary, asks before remote deletes (and optionally before auto-sync local deletes), then passes tasks through `optimizeTasks()`.
4. Execution runs task groups in parallel, updates progress after displayable tasks, retries transient failures, and stops on cancellation.
5. Finalization writes result and error summaries into the run snapshot and closes the run as completed, failed, cancelled, or noop.

## Integration

- Reads vault and WebDAV state through `~/fs/vault` and `~/fs/webdav`, and persists sync metadata through `~/storage/SyncRecord`.
- Uses plugin services for delete confirmation, observability, settings, i18n, logging, and run snapshot events.
- Depends on utility helpers for path normalization, remote encryption path resolution, merge resolution, chunk splitting, and task bucketing.
- Task implementations call the underlying vault/WebDAV APIs directly, then update sync records so later decision passes see the new baseline.
