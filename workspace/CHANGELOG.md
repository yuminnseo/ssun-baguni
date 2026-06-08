<instructions>
## 🚨 MANDATORY: CHANGELOG TRACKING 🚨

You MUST maintain this file to track your work across messages. This is NON-NEGOTIABLE.

---

## INSTRUCTIONS

- **MAX 5 lines** per entry - be concise but informative
- **Include file paths** of key files modified or discovered
- **Note patterns/conventions** found in the codebase
- **Sort entries by date** in DESCENDING order (most recent first)
- If this file gets corrupted, messy, or unsorted -> re-create it. 
- CRITICAL: Updating this file at the END of EVERY response is MANDATORY.
- CRITICAL: Keep this file under 300 lines. You are allowed to summarize, change the format, delete entries, etc., in order to keep it under the limit.

</instructions>

<changelog>
- 2026-06-06: Fixed side cart clipping in `src/screens/HomeDefaultScreen/HomeDefaultScreen.tsx` by removing negative offset margins and restoring cart image width to visible bounds.
- 2026-06-06: Fixed green cart visibility by correcting `imageClassName` width/margin and added `__ANIMA_DBG__` image load/error logs in `src/screens/HomeDefaultWrapper/HomeDefaultWrapper.tsx`.
- 2026-06-06: Adjusted icon/text spacing only for the camera action tile in `src/screens/HomeDefaultWrapper/HomeDefaultWrapper.tsx`.
- 2026-06-06: Documented bottom-sheet action button location and spacing convention in `workspace/CODER.md`.
<!-- NEXT_ENTRY_HERE -->
</changelog>
