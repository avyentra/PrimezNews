# Daily keyless Hindi guidance

The default workflow uses curated Hindi writing, rotated deterministically by
sign and IST date. It is NOT AI or planetary/Panchang calculation. The source
label explicitly says this. Lucky indicators are entertainment only.

- No API key, subscription or paid AI call is used by the daily workflow.
- Standard GitHub-hosted runners are free for this public repository; do not
  switch it to paid/larger runners. Reassess billing if the repository becomes private.
- Schedule: 06:17 IST (00:47 UTC). GitHub schedules can start late.
- Daily cards rotate by date. Weekly/monthly/yearly text uses its own calendar
  period seed, so it stays stable within that period. Text can repeat from the
  finite curated library; this is not new AI writing every day.
- All 12 signs must validate before latest.json is atomically replaced.
- A daily job commits only data/rashifal files and explicitly requests the current
  branch-based Pages build. A build request is not proof of public deployment.
- Actions → Daily Hindi Rashifal → Run workflow is available for the first run.
  Check the run and the Pages deployment afterward.
- Failure leaves the previous published data unchanged. Keep its visible date.

An optional Anthropic provider remains in the Python script for future use;
it is not configured in the workflow and is never called in curated mode.
Local test: python -m unittest discover -s tests -p 'test_*.py'.
