# Recovery Desk

Recovery Desk is a **read-only, local desktop utility** for Windows, macOS, and Linux. It scans a disk image, raw block device, or readable file for recognizable file signatures and writes selected recovered byte ranges to a different destination.

> Recovery Desk is a best-effort file carver, not a guarantee that every deleted file can be recovered. Do not write to the source media, and stop using a device as soon as data loss is noticed.

## Current scope

The first version is deliberately conservative. It never writes to the scan source, never mounts or repairs a filesystem, and refuses to use the source itself as the recovery destination. It supports signature detection and bounded carving for JPEG, PNG, PDF, ZIP, GIF, BMP, MP3, and MP4 fragments. Recovered files use offset-based names because original filenames and folders are generally filesystem metadata rather than content inside the carved bytes.

| Capability | Status |
| --- | --- |
| Disk image scanning | Supported |
| Raw device scanning | Supported when the operating system grants read permission |
| Removable media | Supported through its device path or image file |
| Source writes | Never performed |
| Recovery to a separate directory | Supported |
| Filesystem metadata and original filenames | Not reconstructed in this MVP |
| Encrypted, compressed, overwritten, or TRIM-discarded data | May be unrecoverable |
| Guaranteed support for every filesystem or file type | Not supported |

## Run from source

From this directory:

```bash
npm install
npm start
```

The interface can scan a regular disk image without elevated permissions. Raw devices commonly require administrator permission on Windows or root access on macOS/Linux. If a raw device is not listed automatically, enter its path manually.

## Build installers

The packaging configuration creates platform-native artifacts through Electron Builder:

```bash
npm run package
```

Build on the target operating system when possible. The configured targets are NSIS and portable builds for Windows, DMG for macOS, and AppImage and DEB for Linux.

## Safe operating procedure

Use the affected device as the scan source and save recovered files to another physical device whenever possible. Do not install or run the application from the device being recovered. For a failing disk, create a forensic image first and scan the image rather than repeatedly reading the failing hardware. Recovery Desk does not currently create images, repair filesystems, or perform journal/partition reconstruction.

## Architecture

The Electron main process owns filesystem access and the renderer receives only a narrow context-isolated API. The carver reads in 1 MiB chunks, detects known signatures, determines bounded file ends where possible, and records the source offset and byte length. Recovery copies only selected ranges with exclusive file creation so an existing recovered file is not overwritten.

## Test

```bash
npm test
```

The test suite verifies marker detection across a chunk boundary, byte-for-byte recovery while leaving the source unchanged, and destination safety validation.
