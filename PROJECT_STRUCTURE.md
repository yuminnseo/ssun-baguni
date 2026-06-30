# Project Structure Notes

This document records the current real structure of the ssun-baguni project before larger code organization work. Treat it as a safety checklist when planning future changes.

## Actual Technology Stack

- Vite
- React 18
- TypeScript
- React Router
- Tailwind CSS v3
- Supabase
- Mixpanel

## Important Framework Notes

The existing PRD mentions Next.js App Router, but the current implementation is a Vite React app.

Future work should not assume:

- `src/app` exists
- Next.js App Router conventions apply
- Next.js routing is used
- server actions are available
- Next.js server/client component boundaries apply

Use the actual Vite, React Router, and browser-side React structure as the source of truth.

## Runtime Asset Baseline

`vite.config.ts` currently sets `publicDir` to `./assets`.

That means runtime asset paths should be treated as coming from `assets/`, including:

- `/icons`
- `/cart`
- `/fonts`
- `/items`
- `/navigation-icons`
- `/sticker`

There are also duplicate assets under `public/`. Do not delete or move them until all references and build behavior have been checked.

## Current Routing And Screen Baseline

The actual app entry flow is:

1. `src/index.tsx`
2. `App`
3. `AuthProvider`
4. `RouterProvider`
5. `createBrowserRouter`

Current major routes:

- `/` falls through to the catch-all `/*` route and renders `HomeDefault`.
- `/*` renders `HomeDefault`.
- `/home-defaultu9501` renders `HomeDefault`.
- `/home-defaultu95u4366u4462u4352u4449u4370u4449u4352u4469` renders `HomeDefault`.
- `/home-defaultu95u4354u4449u4527u4365u4449u4363u4469u4355u4457u4540` renders `HomeDefaultScreen`. This is the long Anima-style `HomeDefaultScreen` route.
- `/home-edit-color` renders `HomeEditColor`.
- `/privacy` renders `LegalDocumentPage` with the privacy document.
- `/terms` renders `LegalDocumentPage` with the terms document.

The current real home screen baseline file is `src/screens/HomeDefault/HomeDefault.tsx`.

`/` and other general paths are rendered by `HomeDefault` through the catch-all `/*` route. Future "home screen" work should use `src/screens/HomeDefault/HomeDefault.tsx` as the baseline unless a routing change explicitly says otherwise.

Confusing home-like screens:

- `HomeDefaultScreen` is only used by a specific long Anima-style route. It is not the current default home screen baseline.
- `HomeDefaultWrapper` appears to be unused by the current router. It may be a cleanup candidate, but confirm whether it is kept for reference, QA, or prototype comparison before deleting it.
- Both files look like home screens by name, so be explicit when giving work instructions.

Deletion judgment:

- `HomeDefault`: do not delete.
- `HomeDefaultScreen`: hold.
- `HomeDefaultWrapper`: deletion candidate, but do not delete before confirming its preservation purpose.

## High-Risk Files

The following files are strongly connected to current app behavior. Do not casually edit, move, rename, or delete them.

- `src/screens/HomeDefault/HomeDefault.tsx`
- `src/components/CartSlotItems.tsx`
- `src/lib/data/items.ts`
- `src/lib/data/noSpendDays.ts`
- `src/lib/storage/itemImages.ts`
- `src/lib/functions/removeItemBackground.ts`
- `src/lib/analytics/mixpanel.ts`
- `supabase/schema.sql`
- `supabase/storage-policies.sql`
- `tailwind.css`

## Current Structural Risks

- `HomeDefault.tsx` is a very large file. It combines UI state, database reads and writes, Storage upload/delete behavior, background removal, Mixpanel tracking, share flows, terms agreement, and account withdrawal flows.
- `assets/` and `public/` both contain assets, which can make the real runtime asset source unclear.
- `HomeDefault`, `HomeDefaultScreen`, and `HomeDefaultWrapper` may have overlapping or historical prototype roles. Confirm which screen is active before changing any of them.
- `tailwind.css` is a large single CSS file.
- Design tokens and color definitions are spread across CSS variables, TypeScript constants, and screen-level code.
- Some data-layer code depends on UI component types, which makes the boundary between data and presentation less clear.
- Mixpanel appears to be implemented in code, while legal document wording may still describe Mixpanel as a future or not-yet-introduced tool. Confirm this before public release.

## Recommended Cleanup Order

Approach cleanup incrementally. Do not start with a broad refactor.

1. Documentation only.
2. Confirm which screens are actively used and which screens are historical or unused.
3. Inventory asset reference paths before moving or deleting any asset.
4. Extract only pure constants and types first.
5. Split behavior into small hooks or services where the behavior boundary is already clear.
6. Organize CSS and token structure.
7. Clarify data-layer boundaries before adding Calendar, Friends, or MY features.
