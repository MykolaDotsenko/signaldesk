# SignalDesk

**A browser notebook for notes, ideas and useful links — designed around finding things again, not just capturing them.**

[**Open SignalDesk →**](https://signaldesk-workspace.vercel.app/) · [Architecture](./ARCHITECTURE.md)

![SignalDesk desktop workspace](./docs/screenshots/signaldesk-desktop.png)

### Interface direction

The current UI treats the notebook as a **starship bridge archive console**: telemetry-style panels, a physical command-deck frame and optional synthesized interface audio. The theme changes presentation and feedback, not the data model — notes, search, backup/restore and local persistence still work as ordinary browser application features.

Audio can be disabled; critical state is never communicated by sound alone.

```text
capture → tag → pin → search → revisit
```

## What goes into the library

Each signal is one of three types:

- **Note**
- **Idea**
- **Link**

Signals can be tagged, pinned, favorited, edited and removed with Undo.

Search covers title, body, type and tags. Filters and sorting operate over one canonical collection rather than maintaining separate copies of the same data.

## Backup and restore

Export is intentionally simple JSON. Restore is stricter.

Before a file can replace the current library, SignalDesk verifies:

- valid JSON;
- SignalDesk backup identity/version;
- an array of normalizable signals;
- unique IDs;
- maximum file size of 5 MB;
- maximum 5,000 records.

The app shows the restore count before replacement instead of applying a valid-looking file immediately.

## Storage failure is visible

The working library is stored in versioned browser storage.

Older array-only data is migrated on read. Invalid saved data does not crash the UI.

If the browser rejects writes, SignalDesk switches to memory-only mode and tells the user that persistence is unavailable. The current session remains usable, and JSON export is still available.

There is no account, backend database or analytics SDK.

## Architecture

```text
React UI
   ├── signal reducer / normalization
   ├── search / filter / sort
   ├── browser storage
   └── backup parser / exporter
```

Domain functions do not depend on the DOM. Search results, counts, pinned/favorite views and sorting are derived from the signal collection.

## Desktop and mobile

<table>
  <tr>
    <td width="66%">
      <img src="./docs/screenshots/signaldesk-library.png" alt="SignalDesk library with search, filters and sorting" width="100%" />
    </td>
    <td width="34%">
      <img src="./docs/screenshots/signaldesk-mobile.png" alt="SignalDesk mobile workspace" width="100%" />
    </td>
  </tr>
</table>

Keyboard shortcuts:

- `N` — capture
- `/` — search
- `Esc` — leave/clear search

Reduced-motion and forced-colors modes are supported.

## Stack

- React 19
- Vite 8
- JavaScript
- modern CSS
- Web Storage
- Vitest
- Playwright
- axe-core
- ESLint
- GitHub Actions

## Quality

Browser tests cover create, search, edit, delete/Undo, reload persistence, filters, backup/restore, blocked storage, accessibility and horizontal overflow across Chromium, Firefox, WebKit and mobile Chromium.

```bash
npm ci
npm run check
npx playwright install chromium firefox webkit
npm run test:e2e
```

## Run locally

```bash
npm ci
npm run dev
```
