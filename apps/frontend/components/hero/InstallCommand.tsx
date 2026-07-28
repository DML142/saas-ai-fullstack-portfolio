'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

const COMMAND = 'npm i -g coscode';
const COPIED_RESET_MS = 1500;

/**
 * Clipboard fallback for when `navigator.clipboard` is unavailable — an
 * insecure context (e.g. testing over a LAN IP like `http://192.168.x.x`) or
 * Safari's partial support. Copies via a hidden textarea and `execCommand`.
 *
 * `readonly` + `focus({ preventScroll: true })` stop mobile browsers from
 * opening the virtual keyboard and auto-scrolling the page on focus; pinning
 * it at `top:0; left:0` with `opacity:0` (not shoved off-screen) keeps its
 * position unambiguous. `setSelectionRange` is used over `.select()`, which
 * Safari doesn't reliably apply to a readonly textarea.
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
      // Clipboard access can be denied — log rather than fail silently.
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
