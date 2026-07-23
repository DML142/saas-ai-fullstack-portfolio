'use client';

import { listWorkspaces } from '@/lib/stores/chat';
import { useWorkspaceStore } from '@/lib/stores/workspace.store';
import { useEffect } from 'react';

export function WorkspaceBootstrap() {
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);
  const setError = useWorkspaceStore((s) => s.setError);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const workspaces = await listWorkspaces();
        if (!cancelled) setWorkspace(workspaces);
      } catch {
        if (!cancelled) setError();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setWorkspace, setError]);

  return null;
}
