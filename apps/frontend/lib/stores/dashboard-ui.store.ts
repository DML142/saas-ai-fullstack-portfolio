import { create } from 'zustand';

/** Mobile-only sidebar drawer state. Lives in its own store, not the
 * Sidebar's local state, because the toggle button naturally belongs in the
 * chat header (ChatPanel) while the panel itself renders from the layout
 * (Sidebar) — same sibling-communication problem the workspace switcher
 * already solved this way. */
interface DashboardUiState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
}

export const useDashboardUiStore = create<DashboardUiState>((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  closeSidebar: () => set({ sidebarOpen: false }),
}));
