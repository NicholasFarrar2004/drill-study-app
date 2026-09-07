# Verification

Run `python3 -B qa/verify.py` from this folder.

Verified on September 7, 2026:

- 189 behavior assertions passed against the inline JavaScript in the shipped `drill.html`.
- 26 versioning assertions passed against that same script.
- 11 Python storage/API tests passed with entirely synthetic data in temporary databases.
- Content validation passed for the fictional library and the appended candidate. Its optional warnings flag a short correct answer and a tag used once; these are editorial heuristics, not schema failures.
- Append-only authoring preserved the existing lesson and refused a duplicate ID, an existing output path, malformed image data, and remote image URLs. Image attribute injection also has a behavioral regression assertion.
- HTTP smoke test served the actual demo HTML, read an empty database, saved/exported a flag, rejected a cross-origin request, and refused an import into a nonempty store.
- The distribution contained no `Data` folder or saved study records after verification. Temporary servers and databases were shut down and cleaned up.

BrowserClaw UI verification on September 7, 2026 used the real local server with a temporary database outside this distribution. The teaching reveal, multiple choice, select-all, matching and ordering interactions completed successfully at 4/4. The results page rendered legibly. Reloading the home page retained the completed attempt and last score; its animated accuracy counter settled at 100%. The first successful pass put questions in review box 1, so Known remained 0/4 as designed.

The JavaScript suites use a synthetic DOM and complement that browser check. Physical-phone/Safari behavior, browser-level gestures, keyboard shortcuts and backup downloads were not verified in this edition. Previous app QA does not establish that the curated edition was independently tested on those devices.

The privacy scan is a review aid, not proof against every possible sensitive value. The owner approved publication of this curated edition. No open-source license has been assigned; see PROVENANCE.md.
