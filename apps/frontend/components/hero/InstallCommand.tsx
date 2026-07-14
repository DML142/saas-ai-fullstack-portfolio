'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

const COMMAND = 'npm i -g coscode';
const COPIED_RESET_MS = 1500;

/**
 * `navigator.clipboard` only exists in a secure context (HTTPS, or
 * localhost). Testing over a LAN IP on a phone — `http://192.168.x.x:3001`,
 * the common way to check mobile without deploying — is exactly the case
 * that isn't secure, so `navigator.clipboard` is `undefined` there and
 * `.writeText` throws "cannot read properties of undefined" before the
 * try/catch's `await` ever gets a chance to catch a *rejection*. This will
 * stop mattering once the site is actually deployed behind HTTPS, but the
 * fallback also covers Safari's older/partial support, so it's worth
 * keeping regardless.
 *
 * The fallback is the pre-Clipboard-API technique: a hidden textarea gets
 * selected and copied via `execCommand`. Still broadly supported despite
 * being formally deprecated, and there's no modern equivalent that works
 * without HTTPS.
 *
 * A naive version of this trick (push it off-screen with `left: -9999px`,
 * call `.select()`) causes exactly the symptom reported here — an unrelated
 * jump down the page on copy. `.select()` focuses the textarea, and mobile
 * browsers auto-scroll a focused *editable* field into view to make room for
 * the virtual keyboard. Pushing it off-screen horizontally does nothing
 * about that: `top` was left unset, so with `position: fixed` and no `top`
 * the vertical axis falls back to wherever the element would land in normal
 * document flow — a position that has nothing to do with where ScrollSmoother
 * thinks the page is, and the two can end up far apart. Two changes remove
 * both triggers:
 *  - `readonly` stops the virtual keyboard from opening at all (a readonly
 *    field can still be selected and copied), which removes the reason for
 *    keyboard-driven scrolling in the first place.
 *  - `focus({ preventScroll: true })` is the direct, modern way to tell the
 *    browser not to scroll on focus, as a second layer independent of the
 *    keyboard.
 * Pinning it at `top: 0; left: 0` with `opacity: 0` (rather than shoving it
 * off-screen) also means there's nothing left ambiguous about its position
 * for either mechanism to react to. `setSelectionRange` replaces `.select()`
 * because Safari has a long history of `.select()` not reliably selecting a
 * `readonly` textarea's content.
 */
function legacyCopy(text: string) {
  const el = document.createElement('textarea');
  el.value = text;
  el.setAttribute('readonly', '');
  el.style.position = 'fixed';
  el.style.top = '0';
  el.style.left = '0';
  el.style.opacity = '0';
  el.style.pointerEvents = 'none';
  document.body.appendChild(el);
  el.focus({ preventScroll: true });
  el.setSelectionRange(0, text.length);
  try {
    return document.execCommand('copy');
  } finally {
    document.body.removeChild(el);
  }
}

export function InstallCommand() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(COMMAND);
      } else if (!legacyCopy(COMMAND)) {
        throw new Error('execCommand copy was rejected');
      }
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_RESET_MS);
    } catch (error) {
      // Clipboard access can be denied (permissions policy, insecure
      // context, browser restrictions) — fail visibly in dev rather than
      // silently doing nothing from the user's perspective.
      console.error('Failed to copy install command:', error);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm text-foreground/60">install with 1 command</p>
      <div className="flex items-center gap-4 rounded-md border border-border bg-card px-4 py-2.5">
        <code className="font-mono text-sm text-foreground">{COMMAND}</code>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'Copied' : 'Copy install command'}
          className="text-foreground/60 transition-colors hover:text-primary"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  );
}
