// Recovery Desk — quick USB user manual.
#import "report-theme.typ": report-accent, report-theme

#show: report-theme.with(
  title: "Recovery Desk",
  author: "Manus AI",
  rhythm: "report",
  running-header: true,
)

// ---------- Title page ----------
#page(margin: (top: 30%, x: 2.2cm), numbering: none, header: none)[
  #set par(first-line-indent: 0em)
  #align(center)[
    #text(size: 28pt, weight: "bold", fill: report-accent)[Recovery Desk]
    #v(0.6em)
    #text(size: 15pt, fill: luma(80))[Quick USB User Manual]
    #v(2em)
    #line(length: 40%, stroke: 0.6pt + luma(160))
    #v(2em)
    #text(size: 11pt)[
      Read-only file recovery with local preview \
      Windows · macOS · Linux \
      #datetime.today().display("[year]-[month]-[day]")
    ]
  ]
]

// ---------- Table of contents ----------
#page(numbering: none, header: none)[
  #outline(title: [Contents], indent: 1.5em)
]

#counter(page).update(1)

= Start here

Recovery Desk is a portable, offline desktop application. It scans a disk image, raw device, volume, or readable file without intentionally writing to the source. Use the affected device as the source and save recovered files to another physical device whenever possible.

#block(fill: rgb("FFF3D9"), inset: 12pt, radius: 6pt, width: 100%)[
  *Important:* Do not install or run the application from the device being recovered. Do not save recovered files to the scan source. Recovery is best-effort and cannot restore data that has been overwritten, encrypted, or discarded by SSD TRIM.
]

= Launch from a USB drive

Extract the USB bundle and open the folder for the current operating system. The bundle contains separate native portable builds; one executable cannot run on all three operating systems.

#table(
  columns: (1.25fr, 2fr, 2.5fr),
  stroke: 0.5pt + luma(205),
  inset: 7pt,
  [*System*], [*Open*], [*First launch*],
  [Windows 10/11 x64], [Windows/Recovery Desk Portable.exe], [Double-click. Use Run Recovery Desk.cmd if preferred.],
  [macOS x64], [macOS/Recovery Desk.app], [An unsigned build may require Control-click, then Open.],
  [Linux x64], [Linux/Recovery Desk.AppImage], [Mark executable if needed, then double-click or run Run Recovery Desk.sh.],
)

#block(fill: luma(245), inset: 10pt, radius: 4pt)[
  #text(font: "DejaVu Sans Mono", size: 9pt)[
    USB drive/ \
    ├── START HERE.md \
    ├── Windows/Recovery Desk Portable.exe \
    ├── macOS/Recovery Desk.app \
    └── Linux/Recovery Desk.AppImage
  ]
]

= Recover files in five steps

+ *Choose the source.* Enter a path manually or select a detected volume. Raw devices may require administrator or root permission.
+ *Start a scan.* The source is read in chunks. Large devices can take a long time; do not disconnect the source while scanning.
+ *Filter the results.* Use keyword, file type, confidence, minimum size, and maximum size filters to narrow the list.
+ *Preview before recovery.* Click a result row. Text files appear in a text viewer, images appear in the pane, and videos load into a media player when the format is supported.
+ *Recover to another location.* Select files, choose a destination folder on a different drive, and click Recover selected.

= Filter and preview results

The filter toolbar appears after a scan. Keyword search checks the generated filename, detected type, MIME type, and extension. File type and confidence are dropdown filters. Size limits are entered in kilobytes; leave either field blank for no limit.

The results table shows the generated filename, type, source offset, carved size, and confidence. Select a row to load its preview. Previewing reads only that candidate's recorded byte range; it does not rescan or alter the source.

#table(
  columns: (1.55fr, 3.6fr),
  stroke: 0.5pt + luma(205),
  inset: 7pt,
  [*Preview*], [*Behavior*],
  [Text], [Text-like fragments are shown in a bounded, scrollable text viewer.],
  [Image], [Supported image fragments are displayed inside the preview pane.],
  [Video], [A temporary local copy is created in the operating system temp directory so the built-in video controls can play it.],
  [Other types], [The file remains recoverable, but the pane reports that preview is unavailable.],
)

Use *Select visible* to select only rows currently matching the filters. If a filter hides a previously selected row, that row remains selected. Always check the selected count before recovery.

= Recover safely

Choose a destination folder before clicking *Recover selected*. Recovery Desk creates new files with offset-based names and refuses to overwrite an existing file with the same name. The recovered files may need to be opened and checked because a file signature does not guarantee that every fragment is complete.

If the source is a failing disk, make an image first and scan the image rather than repeatedly reading the failing hardware. Recovery Desk does not create forensic images, repair filesystems, reconstruct original folders, or restore original filenames in this MVP.

= Troubleshooting

- *The source is not listed.* Enter its path manually. Refresh the detected-source list and confirm that the operating system has granted read permission.
- *Permission denied.* Close applications using the source. On Windows, start the portable executable with the required administrator permission. On macOS/Linux, use the permission level required for raw-device access.
- *No results are found.* Try a disk image or raw device rather than a normal directory. Stop using the source device as soon as data loss is noticed.
- *A preview is unavailable.* The file may be unsupported, too large for bounded preview, incomplete, or not actually the detected format. It can still be selected for recovery.
- *macOS blocks the app.* The distributed macOS build is unsigned. Use Control-click → Open only when you trust the copy and its source.

= Supported file signatures

The current carving engine recognizes JPEG, PNG, PDF, ZIP, GIF, BMP, MP3, MP4, and conservative printable-text fragments. It is not a universal filesystem undelete engine. Encrypted, compressed, fragmented, overwritten, or TRIM-discarded data may not be recoverable.

For help, keep the source unchanged, record the source path and operating system, and describe whether the scan was performed against a disk image or raw device. Do not send the source media or recovered data unless you have a secure, appropriate process for doing so.
