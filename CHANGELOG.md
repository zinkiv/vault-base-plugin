# Changelog

## Vault Base v0.2.4 - 2026-08-19

- Stopped an empty new vault from deleting an existing remote repository, even when a shared name like Welcome.md overlaps.
- Ask for confirmation before deleting remote files. Keeping remote files downloads them to this vault instead of wiping the server.

## Vault Base v0.2.3 - 2026-08-19

- Prevented an empty new local vault from wiping an existing remote repository.
- Removed unsupported `localspace` write-coalesce options so typecheck passes on 2.1.0.
- Documented commit, tag, and GitHub Release steps for publishing to the community directory.

## Vault Base v0.2.2 - 2026-08-12

- Added English README content for the community directory listing.

## Vault Base v0.2.1 - 2026-08-12

- Renamed project to `vault-base-plugin` and plugin id/display name to `vault-base` / Vault Base.

## Vault Base v0.2.0 - 2026-08-11

- Adopted the Obsidian WebDAV Sync 2.5.14 codebase as Vault Base.
- Rebranded plugin id, display name, and IndexedDB namespace (previously `vault-hub`).
- Removed the v3 migration path, related UI, and tests.
- Replaced Bun-only version/release scripts with Node.js scripts for Windows.
- Added `npm run package` to emit Obsidian store artifacts in `release/`.

Upstream history below is retained for attribution.

## Obsidian WebDAV Sync v2.5.14 - 2026-08-08

See the upstream [CHANGELOG](https://github.com/hesprs/obsidian-webdav-sync/blob/main/CHANGELOG.md) for 1.0.0 through 2.5.14.
