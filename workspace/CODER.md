<instructions>
This file will be automatically added to your context. 
It serves multiple purposes:
  1. Storing frequently used tools so you can use them without searching each time
  2. Recording the user's code style preferences (naming conventions, preferred libraries, etc.)
  3. Maintaining useful information about the codebase structure and organization
  4. Remembering tricky quirks from this codebase

When you spend time searching for certain configuration files, tricky code coupled dependencies, or other codebase information, add that to this CODER.md file so you can remember it for next time.
Keep entries sorted in DESC order (newest first) so recent knowledge stays in prompt context if the file is truncated.
</instructions>

<coder>
## 2026-06-06
- Green cart visibility in `src/screens/HomeDefaultWrapper/HomeDefaultWrapper.tsx` is controlled by `carts[].imageClassName`; tiny width/margin values can make the image appear missing.
- Bottom sheet action tiles are defined in `src/screens/HomeDefaultWrapper/HomeDefaultWrapper.tsx` under `actionItems.map(...)`.
- Camera/Gallery button spacing is controlled via Tailwind `gap-*` on each action `<button>`.
</coder>
