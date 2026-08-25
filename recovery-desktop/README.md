# Recovery Desk

Recovery Desk is a **read-only, local desktop utility** for Windows, macOS, and Linux. It scans a disk image, raw block device, or readable file for recognizable file signatures and writes selected recovered byte ranges to a different destination.

> Recovery Desk is a best-effort file carver, not a guarantee that every deleted file can be recovered. Do not write to the source media, and stop using a device as soon as data loss is noticed.

## USB-ready use

The application is distributed as separate portable builds because Windows, macOS, and Linux require different executable formats. Put the generated `usb-bundle` directory at the top level of a USB drive. On the target computer, open the folder for that operating system and launch its application. No installer is required.

| Operating system | Portable item | Launch method |
| --- | --- | --- |
| Windows 10/11 | `Windows/Recovery Desk Portable.exe` | Double-click the executable or `Run Recovery Desk.cmd`. |
| macOS | `macOS/Recovery Desk.app` | Double-click the app or `Run Recovery Desk.command`. An unsigned local build may require Control-click → Open on first launch. |
| Linux | `Linux/Recovery Desk.AppImage` | Mark it executable and double-click it, or use `Run Recovery Desk.sh`. |

The USB drive should have enough free space for the recovered data. Do not save recovered files onto the same source device; select another drive or a separate location on the USB drive only if it has adequate capacity and is not the scan source.

## Build the USB bundle

Install dependencies and run the tests:

```bash
npm install
npm test
```

Build the portable artifact for the operating system on which you are working:

```bash
npm run package:windows
npm run package:macos
npm run package:linux
```

Then assemble any artifacts that exist in `dist/`:

```bash
npm run bundle:usb
```

For a complete USB bundle, build the three platform artifacts and then combine the three platform directories under one `usb-bundle` folder. The included bundle assembler automatically creates the folders and launch helpers for every artifact that exists in `dist/`.

## Filtering recovery results

After a scan completes, use the filter toolbar above the results table to narrow recoverable fragments by keyword, file type, confidence level, minimum size, and maximum size. The keyword search checks the generated filename, detected type, MIME type, and extension. The filters are applied locally to the scan results and do not rescan or modify the source.

Select individual rows or use **Select visible** to select only the rows currently shown. If a filter hides an already selected row, that row remains selected; the recovery panel always shows the total selected count. Review that count before choosing a destination and starting recovery.

## Current scope

The first version is deliberately conservative. It never writes to the scan source, never mounts or repairs a filesystem, and refuses to use the source itself as the recovery destination. It supports signature detection and bounded carving for JPEG, PNG, PDF, ZIP, GIF, BMP, MP3, and MP4 fragments. Recovered files use offset-based names because original filenames and folders are generally filesystem metadata rather than content inside the carved bytes.

| Capability | Status |
| --- | --- |
| Disk image scanning | Supported |
| Raw device scanning | Supported when the operating system grants read permission |
| Removable media | Supported through its device path or image file |
| USB operation without installation | Supported through platform-specific portable builds |
| Source writes | Never performed |
| Recovery to a separate directory | Supported |
| Filter by keyword, type, confidence, and size | Supported |
| Filesystem metadata and original filenames | Not reconstructed in this MVP |
| Encrypted, compressed, overwritten, or TRIM-discarded data | May be unrecoverable |
| Guaranteed support for every filesystem or file type | Not supported |

## Safe operating procedure

Use the affected device as the scan source and save recovered files to another physical device whenever possible. Do not install or run the application from the device being recovered. For a failing disk, create a forensic image first and scan the image rather than repeatedly reading the failing hardware. Recovery Desk does not currently create images, repair filesystems, or perform journal/partition reconstruction.

Raw devices commonly require administrator permission on Windows or root access on macOS/Linux. The portable application itself does not elevate automatically; start it with the permissions required by the operating system when a raw device cannot be opened.

## Architecture

The Electron main process owns filesystem access and the renderer receives only a narrow context-isolated API. The carver reads in 1 MiB chunks, detects known signatures, determines bounded file ends where possible, and records the source offset and byte length. Recovery copies only selected ranges with exclusive file creation so an existing recovered file is not overwritten.

## Test

```bash
npm test
```

The test suite verifies marker detection across a chunk boundary, byte-for-byte recovery while leaving the source unchanged, and destination safety validation.
