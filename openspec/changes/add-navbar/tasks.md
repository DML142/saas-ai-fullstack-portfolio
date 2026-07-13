## 1. Navbar component [you implement]

- [ ] 1.1 Create `components/layout/Navbar.tsx`: logo (`public/cosico.png` via `next/image`) on the left, nav links (`#features`, `#pricing`, `#faq`) centered/right, CTA button on the far right
- [ ] 1.2 Apply `sticky top-0` positioning so it stays visible while scrolling
- [ ] 1.3 Add a scroll listener (or `useMediaQuery`-style hook, or a plain `useEffect` + `window.scrollY` check) toggling a boolean once scrolled past a threshold (e.g. 40px), driving a Tailwind background/blur class transition (transparent → solid dark, with `transition-colors`)

## 2. Mobile menu [you implement]

- [ ] 2.1 Add a hamburger toggle button, visible only below the `sm`/`md` breakpoint (hide the inline desktop links at that size)
- [ ] 2.2 Implement the toggle: a boolean state opening/closing a menu panel containing the same links, with a CSS transition (slide or fade)
- [ ] 2.3 Close the menu when a link is clicked or the toggle is pressed again

## 3. Wire into the root layout [you implement]

- [ ] 3.1 Render `<Navbar />` in `app/layout.tsx`, above `{children}`, so it's present on every route
- [ ] 3.2 Confirm the navbar doesn't visually conflict with the hero's `ChromaticAberration`/`StarField` layers (z-index, stacking order)

## 4. Verification

- [ ] 4.1 Confirm the navbar renders correctly on the landing page, logo and links visible
- [ ] 4.2 Scroll the page and confirm the background transitions from transparent to solid past the threshold, and stays stuck to the top throughout
- [ ] 4.3 Resize to mobile width and confirm the inline links hide, hamburger toggle appears, and opens/closes the mobile menu correctly
- [ ] 4.4 Confirm nav links don't error (even though their anchor targets don't exist yet) and the CTA button is styled consistently with the hero's existing buttons
