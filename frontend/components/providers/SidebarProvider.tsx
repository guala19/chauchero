"use client";

import { createContext, useContext } from "react";

interface SidebarContextType {
  collapsed: boolean;
}

export const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
});

export function useSidebar() {
  return useContext(SidebarContext);
}
