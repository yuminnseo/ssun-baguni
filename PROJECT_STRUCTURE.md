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

`vite.config.ts` currently sets `publicDir` to `./static`.

That means runtime asset paths should be treated as coming from `static/`, including:

- `/icons`
- `/cart`
- `/fonts`
- `/items`
- `/navigation-icons`
- `/sticker`

There are also duplicate assets under `public/`. Do not delete or move them until all references and build behavior have been checked.

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
- `static/` and `public/` both contain assets, which can make the real runtime asset source unclear.
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
