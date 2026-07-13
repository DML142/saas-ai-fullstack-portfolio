## 1. Mock auth hook [AI-authored — built directly per explicit request]

- [x] 1.1 Create `hooks/useAuth.ts`: hardcoded placeholder returning `{ isLoggedIn, user }`, clearly commented as a mock to be replaced with real session verification later

## 2. Navbar component [AI-authored — built directly per explicit request]

- [x] 2.1 Create `components/layout/Navbar.tsx`: logo (`public/cosico.png`) + nav links (Home, Features, Reviews, Pricing) on the left
- [x] 2.2 Right side, logged-out: Register + Login buttons, generic avatar icon (`public/userico.png`), no name
- [x] 2.3 Right side, logged-in: "Open Chat" button, user's name (left of avatar), avatar icon
- [x] 2.4 Apply positioning to keep the navbar visible while scrolling — implemented as `fixed inset-x-0 top-0` (overlay), not `sticky` as originally drafted, since the design calls for the navbar to render *transparently over* the hero rather than taking up flex space and shrinking it (`sticky` would have pushed the hero content down by the navbar's height)
- [x] 2.5 Scroll listener (via a new `useScrolled(thresholdPx)` hook, same `useSyncExternalStore` pattern as the hero's `useReducedMotion`/`useMediaQuery`) toggling a boolean past a threshold, driving a transparent → solid/blurred background transition via Tailwind `transition-colors` — verified live by forcing an actual scroll past the threshold and confirming the computed background/backdrop-filter changed, then reverted on scroll-up
- [x] 2.6 (added) Logo sized up twice per feedback: 32px → 44px → 60px, with the navbar height bumped `h-16` → `h-20` to keep it comfortably proportioned rather than cramped

## 3. Mobile menu [AI-authored — built directly per explicit request]

- [x] 3.1 Hamburger toggle, visible only below the `md` breakpoint (hide desktop inline content at that size)
- [x] 3.2 Toggle opens/closes a menu panel containing the same links and auth controls
- [x] 3.3 Close the menu on link click or re-toggling
- [x] 3.4 (added) Open/close animation: opacity + slide down from above, per explicit request. Required restructuring from conditional *rendering* (`{mobileOpen && ...}`, which mounts/unmounts instantly with no "before" state to animate from) to always-mounted with conditional classes, `absolute`-positioned so the closed panel doesn't reserve layout space. Pure CSS transition (`transition-all duration-300`), no animation library, consistent with the design decision to keep this piece GSAP-free.
- [x] 3.5 (added) Accessibility fix: `aria-hidden` alone does not remove a closed panel's links from keyboard tab order in most browsers. Confirmed directly — calling `.focus()` on a hidden link left `document.activeElement` unchanged before the fix. Added the `inert` attribute (`inert={!mobileOpen}`), which correctly blocks focus/hit-testing/AT-exposure on the whole subtree; re-verified the same `.focus()` test afterward and confirmed it no longer moves focus.

## 4. Wire into the root layout [AI-authored]

- [x] 4.1 Render `<Navbar />` in `app/layout.tsx`, above `{children}`
- [x] 4.2 Confirm no visual/stacking conflict with the hero's `ChromaticAberration`/`StarField` layers (fixed positioning + z-50 keeps it correctly above both)

## 5. Verification

- [x] 5.1 Confirm the navbar renders on the landing page: logo, links, and (mocked) auth controls all visible
- [x] 5.2 Toggle the mock auth state and confirm both variants render correctly (Register/Login vs. Open Chat/name), and the avatar always shows — verified live in-browser for both states
- [x] 5.3 Scroll the page and confirm the background transitions from transparent to solid past the threshold — verified by temporarily padding the page to make it scrollable (the real page has no content below the hero yet), scrolling past 40px, confirming the computed style change, then reverting
- [x] 5.4 Resize to mobile width and confirm inline content hides, hamburger toggle appears, and the mobile menu opens/closes correctly with the slide/fade animation in both auth states
