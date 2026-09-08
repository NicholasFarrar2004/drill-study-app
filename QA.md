# Verification

Run `python3 -B qa/verify.py` from this folder.

Automated checks verified on September 8, 2026:

- 190 behavior assertions passed against the inline JavaScript in the shipped `drill.html`.
- 20 review-loop and 32 completion/stack assertions passed, covering strict threshold boundaries, saved rounds, legacy review links, retake navigation, completion and restoration.
- 26 versioning assertions passed against that same script.
- 11 Python storage/API tests passed with entirely synthetic data in temporary databases.
- Content validation passed for the fictional library and the appended candidate. Its optional warnings flag a short correct answer and a tag used once; these are editorial heuristics, not schema failures.
- Append-only authoring preserved the existing lesson and refused a duplicate ID, an existing output path, malformed image data, and remote image URLs. Image attribute injection also has a behavioral regression assertion.
- HTTP smoke test served the actual demo HTML, read an empty database, saved/exported a flag, rejected a cross-origin request, and refused an import into a nonempty store.
- The distribution contained no `Data` folder or saved study records after verification. Temporary servers and databases were shut down and cleaned up.

BrowserClaw UI verification on September 7, 2026 used the real local server with a temporary database outside this distribution. The teaching reveal, multiple choice, select-all, matching and ordering interactions completed successfully at 4/4. The results page rendered legibly. Reloading the home page retained the completed attempt and last score; its animated accuracy counter settled at 100%. The first successful pass put questions in review box 1, so Known remained 0/4 as designed.

BrowserClaw verification on September 8 used the updated public HTML and a separate temporary database. A deliberate first-question miss produced 3/4; manual review retried just that question, preserved 3/4 and recorded one restart, then marked the test complete and archived it. Starting a full retake reactivated the same card stack. Earlier/Newer navigation showed one face at a time, the completed original was green, and reloading retained Retake 1 with one Resume control. The new stack screenshot uses only this fictional history. Automatic threshold cases are covered by the synthetic suite.

The JavaScript suites use a synthetic DOM and complement that browser check. Physical-phone/Safari behavior, browser-level gestures, keyboard shortcuts and backup downloads were not verified in this edition. Previous app QA does not establish that the curated edition was independently tested on those devices.

The privacy scan is a review aid, not proof against every possible sensitive value. The owner approved publication of this curated edition. No open-source license has been assigned; see PROVENANCE.md.
