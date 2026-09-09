# Drill

Drill helps turn a set of lessons into practice you can return to. It explains a concept, asks you to apply it, and saves your answers so you can review the questions you missed.

[How it works](#how-it-works) · [Visual walkthrough](#visual-walkthrough) · [Quick start](#run) · [Try the demo](#five-minute-demonstration) · [Inputs and outputs](#inputs-and-outputs) · [Technical design](ARCHITECTURE.md) · [Tests and limits](QA.md) · [Contribution and license](PROVENANCE.md)

## How it works

Choose a lesson and work through teaching cards and questions. Practice mode explains each answer as you go; exam mode holds feedback until the end. Drill keeps your attempts, notes and review schedule on your own computer. You can leave a session and resume it later.

The included example teaches a fictional workshop's parcel process: Receive, Pack, Dispatch. One lesson file supplies the teaching card and four questions. Answering them correctly produces a 4/4 score, a saved attempt and a green card in Completed. The example demonstrates the app without using real course materials or learner records.

```mermaid
flowchart LR
    A[Lesson JSON] --> B[Teaching cards and practice]
    B --> C[Feedback and saved attempts]
    C --> D[Questions scheduled for review]
    D --> B
```

## Reviews and retakes

When a practice round ends with fewer than 20% of the original scored questions still wrong or skipped, Drill automatically restarts those questions until they are correct. Larger remaining sets have a **Review missed questions** button. The original score and restart count stay with the same attempt. Exactly 20% does not auto-restart; exam mode keeps its results screen.

A full retake adds a labeled layer above the original test card. Only one attempt face is visible at a time. Completed tests turn green and appear in Completed. Archive is a separate, explicit action. Starting a full retake brings the test back into practice. Answer details and review rounds expand when needed.

The four-question demo uses manual review for a single miss because 1/4 is 25%. The regression suite covers automatic repeats with larger fictional tests.

### One stack per test

This September 8 image predates the separate Completed section; the layered attempt controls remain.

The current interface keeps the original attempt beneath its retakes. Here the earlier attempt is complete after one review restart, while the newer retake remains available on the next face.

<img src="examples/walkthrough-stack.png" alt="Green completed original attempt in a single two-attempt card stack, with Earlier and Newer controls" width="680">

## Course terms and quick reference

The Terms tab searches definitions and examples, grouped by course. Each course owns one glossary, so every test uses the same wording. Open the word bank during practice to search the whole course; terms relevant to the current card have a tinted background. Expand a definition to see a visual explanation. The fictional example includes five terms, including Crate from the optional counting lesson.

Notes collapse without losing their text, and the app remembers that preference on the device. Every finished practice attempt offers another full retry. For ordering questions, number shortcuts stay attached to their original choices through selection and undo. Panels respect reduced-motion preferences.

## Visual walkthrough

These historical September 7 screens show the included fictional parcel lesson. The current version also groups retakes into a single layered card and highlights completed tests in green.

### Choose a lesson

The home screen lists the lesson and any questions due for review. Start practice to learn the Receive, Pack, Dispatch process.

<img src="examples/walkthrough-home.png" alt="Drill home screen with the fictional parcel lesson ready to start" width="680">

### Answer and get feedback

Choose an answer to see why it works. Teaching cards explain the process first; matching and ordering questions check whether you can apply it.

<img src="examples/walkthrough-question.png" alt="A fictional practice question with answer choices and feedback" width="680">

### Finish and return later

Four correct answers produce a 4/4 result. Drill saves the attempt and places the test in Completed, so progress remains after you reload. Choose Retake whenever you want another full attempt.

<img src="examples/walkthrough-results.png" alt="Completed fictional practice lesson with a 4/4 score" width="680">

<details>
<summary>Earlier full-size result capture</summary>

<img src="examples/practice-result.png" alt="Fictional practice lesson completed with all four answers correct" width="680">

</details>

The sections below explain how to run the app, supply your own lessons and inspect its implementation. No programming is needed to try the included lesson once the local server is running.

## Run

Requires Python 3.10 or newer. No packages, account, API key, installation step, or network access is needed to use the app. Node.js 18 or newer is used only by authoring and regression checks.

From this folder:

```sh
python3 server.py
```

Open **http://127.0.0.1:8765** in your browser. Stop the server with Ctrl+C. Opening the HTML file directly will not provide persistence. The server creates `Data/drill.sqlite3` on first launch and a SQLite recovery snapshot each time it starts. This folder is ignored by Git. There is no preloaded database.

To use a separate study database or port:

```sh
python3 server.py --port 8766 --data Data/another-demo.sqlite3
```

## Five-minute demonstration

1. Open **Parcel flow at Cedar Workshop** and choose practice.
2. Read the teaching card and reveal its answer. Teaching cards do not affect the score.
3. Answer **Pack** for the first question; select **Receive the order** and **Pack the item** for the next question.
4. Match each stage to its action, then order the stages **Receive → Pack → Dispatch**. Correct on the first try throughout produces **4/4**. The test appears in Completed. Explicitly archiving it removes its questions from the review queue; restoring it returns it to Completed.
5. Return home and open Completed to see the green **Complete** card. Choose Retake to practice it again. Each full retake stacks above the original, with **Earlier** and **Newer** controls to flip between attempts.
6. Open Test details and start an exam to see feedback deferred until results. Leave an unfinished run and resume it from home.
7. Add a note or flag a card. Use **Save file** to download a schema-2 JSON backup. Restart the server: saved progress remains.

Import is intended for an empty database. It refuses to overwrite existing study data. To demonstrate a restore, start a separate database with the command above and import your export there. These two databases do not synchronize.

## Inputs and outputs

| Input | Expected output |
| --- | --- |
| `examples/lesson.json` | One five-card lesson: one unscored teaching card and four scored questions |
| Correct answers in the walkthrough | Completed attempt scored 4/4; green Completed card; review schedule retained |
| Wrong answer | Explanation and a question due for review immediately |
| Note or flag | Saved entry attached to the permanent test ID and card index |
| Save file | `drill-state.json` containing schema version 2 and saved documents |
| Stale write from another tab | Conflict response and a recovery dialog instead of silent replacement |
| `examples/additional-lesson.json` through the append helper | A new candidate HTML file with two lessons; original lesson unchanged |

## Author a lesson

```sh
node append-test.mjs drill.html examples/additional-lesson.json candidate.html
node qa/content-check.js candidate.html
```

The helper refuses existing output files and duplicate test IDs. It creates a candidate without adopting it. Review the candidate before using it. Never reorder existing cards or rename their IDs: saved history references `[testId, cardIndex]`.

Define course terms in `COURSE_GLOSSARIES[courseName]` with `{id, term, definition, aliases, visual: {kind, title, steps: [{label, value}], note}}`. Visual kinds are `flow`, `compare` and `equation`. Reuse stable IDs and add `termRefs: {termId: [cardIndexes]}` to a lesson, or use `TEST_TERM_REFS[testId]`. Definitions belong to the course, not individual tests. Review examples against the lesson and keep visuals readable at narrow widths.

JSON supports teaching cards, single-choice and select-all questions, matching pairs, ordered steps, explanations, tags, and optional images. The shipped fixtures are the complete examples. For an additional image, use an original or appropriately licensed embedded image with descriptive alt text. Treat lesson HTML and authoring inputs as trusted local code, not as arbitrary third-party uploads.

## Verify

```sh
python3 -B qa/verify.py
```

The check runner tests the actual inline app script, synthetic storage, a temporary loopback HTTP server, content validation, and safe lesson appending. Temporary test data is separate from normal study progress. See [QA.md](QA.md) for measured results and limits, [ARCHITECTURE.md](ARCHITECTURE.md) for internals, and [PROVENANCE.md](PROVENANCE.md) for contribution and licensing status.

## Questions and project context

For a reproducible bug, [open an issue](https://github.com/NicholasFarrar2004/drill-study-app/issues) with the steps, expected result and Python/browser versions. Use fictional examples instead of private lessons or study backups.

Nicholas Farrar defined the learning workflow and directed AI-assisted implementation and testing. The [contribution record](PROVENANCE.md) explains that division of work. This is a local study app; remote hosting and cross-device synchronization are outside its current scope. No open-source license has been assigned.
