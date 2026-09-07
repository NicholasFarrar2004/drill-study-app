# Architecture

## Separation of content and progress

`drill.html` contains the layout, styles, study engine, and an inline `TESTS` library. The browser reads this library but never rewrites it. `runtime.js` adapts document-style reads and writes to a local HTTP API. `server.py` stores progress in SQLite using only the Python standard library.

```text
Trusted lesson JSON -> append-test.mjs -> reviewed candidate HTML
                                              |
Browser: drill.html -> runtime.js -> loopback HTTP API -> SQLite
                         |
                    portable JSON export
```

Adding a lesson does not modify the progress database. Test IDs and card positions are permanent because attempts, scheduling, notes and flags all refer to the same `[testId, cardIndex]` pair.

## Study engine

Four card kinds cover teaching notes, multiple choice (including select-all), matching, and ordering. Practice gives immediate feedback; exams permit answer edits and delay verdicts. Teaching cards are never scored or scheduled. Navigation tracks both the current index and furthest visited index so revisiting a card cannot skip unseen content. Matching is correct only with no wrong tries; ordering requires the correct whole sequence.

A Leitner schedule uses day intervals `[1, 3, 7, 21, 60]`. Wrong answers return to box zero and become due immediately. Correct answers advance through the boxes. Review sessions cap at 15 questions. Course filtering, archived tests, topic weak spots, completed history, notes, flags, and unfinished attempts are maintained independently.

The retained versioning engine supports `supersedes` and explicit `carry` mappings. Its synthetic regression suite checks carried schedules/notes/flags, overlap notices, and teaching-card reveals. The minimal demo library does not need an earlier lesson version.

Rendering replaces the main view and reattaches the fixed action dock outside the animated container. One interval updates the active attempt clock. Notes flush before repainting; keyboard shortcuts avoid note inputs. Reduced-motion styling and responsive layouts remain in the original engine. External font requests were removed in this edition; system fonts are used.

## Persistence contract

| Document path | Value |
| --- | --- |
| `attempts/<id>` | Run metadata, refs, answers, checked flags, current/furthest index, elapsed time and completion |
| `state/sched` | `{q: {"testId:index": {box, due}}}` |
| `state/notes` | `{map: {"testId:index": "note"}}` |
| `state/flags`, `state/archive`, `state/carried` | `{list: [...]}` |

The SQLite `docs` table stores one JSON document per path. The `meta` table stores a revision. Browser writes are queued. A write with an obsolete revision fails, protecting another tab's changes. Completed attempts cannot be deleted through the API; only unfinished attempts can be discarded.

| Endpoint | Behavior |
| --- | --- |
| `GET /api/state` | Current revision and documents |
| `POST /api/write` | Revision-checked document update or allowed discard |
| `GET /api/export` | Portable schema-2 envelope |
| `POST /api/import` | Validate and import only into an empty store |

For an empty database, `GET /api/state` returns exactly `{"revision":0,"documents":{}}`. Posting `{"revision":0,"path":"state/flags","value":{"list":["demo-parcel-flow:1"]}}` to `/api/write` returns `{"revision":1}`. Repeating the same revision fails with HTTP 409. Exports include a timestamp, so the complete response is time-dependent.

## Boundaries

The server binds only to `127.0.0.1`, checks Host/Origin/fetch-site headers, and requires JSON writes. It is a personal local demo, not an authenticated internet service. Do not expose it through a public tunnel or bind it to a network interface. Local backups are not encrypted. Other users or programs with filesystem access can read them.

The original deployment adapter is deliberately outside this distribution: its owner-specific configuration and private seed are unnecessary for the local runnable app. Multiuser identity, remote hosting, cross-device synchronization, and automatic AI lesson generation are not provided. The retained local lesson helper is an authoring tool, not an LLM integration. Image source attributes are escaped at rendering and enlargement. The append helper accepts only complete base64 webp/png/jpeg/gif image data URLs with alt text. Content validation is heuristic and does not prove factual correctness or handle untrusted content safely.
