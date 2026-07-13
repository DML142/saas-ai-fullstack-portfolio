'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

const COMMAND = 'npm i -g coscode';
const COPIED_RESET_MS = 1500;

export function InstallCommand() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(COMMAND);
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
