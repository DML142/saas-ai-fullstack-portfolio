import { create } from 'zustand';
import { Workspace } from './chat';

interface WorkspaceState {
  workspaces: Workspace[];
  activeId: string | null;
  status: 'loading' | 'loaded' | 'error';
  setWorkspace: (workspaces: Workspace[]) => void;
  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (workspaceId: string, name: string) => void;
  deleteWorkspace: (workspaceId: string) => void;
  setActive: (id: string) => void;
  setError: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaces: [],
  activeId: null,
  status: 'loading',
  setWorkspace: (workspaces) =>
    set((s) => ({
      workspaces,
      status: 'loaded',
      // Keep the current selection if it's still valid; otherwise default to
      // the first workspace (or null, if the user genuinely has none yet).
      activeId:
        s.activeId && workspaces.some((w) => w.id === s.activeId)
          ? s.activeId
          : (workspaces[0]?.id ?? null),
    })),
  addWorkspace: (workspace) =>
    set((s) => ({
      workspaces: [...s.workspaces, workspace],
      activeId: workspace.id,
    })),
  updateWorkspace: (id, name) =>
    set((s) => {
      const workspaces = s.workspaces.map((w) =>
        w.id === id ? { ...w, name } : w,
      );
      return {
        workspaces,
      };
    }),
  deleteWorkspace: (id) =>
    set((s) => {
      const workspaces = s.workspaces.filter((w) => w.id !== id);
      return {
        workspaces,
        activeId: s.activeId === id ? (workspaces[0]?.id ?? null) : s.activeId,
      };
    }),
  setError: () => set({ status: 'error' }),
  setActive: (id) => set({ activeId: id }),
}));
