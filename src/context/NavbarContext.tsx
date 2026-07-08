import React, { createContext, useContext, useState } from "react";

type NavbarContextType = {
  showNavbar: boolean;
  setShowNavbar: React.Dispatch<React.SetStateAction<boolean>>;
};

const NavbarContext = createContext<NavbarContextType | undefined>(undefined);

export function NavbarProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showNavbar, setShowNavbar] = useState(true);

  return (
    <NavbarContext.Provider value={{ showNavbar, setShowNavbar }}>
      {children}
    </NavbarContext.Provider>
  );
}

export function useNavbar() {
  const context = useContext(NavbarContext);

  if (!context) {
    throw new Error("useNavbar must be used within a NavbarProvider");
  }

  return context;
}