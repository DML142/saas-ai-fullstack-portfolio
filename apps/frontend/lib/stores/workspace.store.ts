import { create } from 'zustand';

export interface Workspace {
  id: string;
  name: string;
}

/** Placeholder data — the real chat backend (workspace persistence, message
 * history) is a separate future change. This just proves the switcher UI and
 * shared active-selection state work end to end. */
const PLACEHOLDER_WORKSPACES: Workspace[] = [
  { id: 'w1', name: 'Getting started' },
  { id: 'w2', name: 'Refactor auth flow' },
  { id: 'w3', name: 'Landing page copy' },
];

interface WorkspaceState {
  workspaces: Workspace[];
  activeId: string;
  setActive: (id: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaces: PLACEHOLDER_WORKSPACES,
  activeId: PLACEHOLDER_WORKSPACES[0].id,
  setActive: (id) => set({ activeId: id }),
}));
