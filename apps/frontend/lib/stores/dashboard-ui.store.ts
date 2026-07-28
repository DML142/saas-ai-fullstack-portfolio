import { create } from 'zustand';

/** Mobile-only sidebar drawer state. In its own store because the toggle lives
 * in the chat header (ChatPanel) while the drawer renders from Sidebar. */
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
