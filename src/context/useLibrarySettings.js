import { useContext } from "react";
import LibrarySettingsContext from "./librarySettingsContext";

export const useLibrarySettings = () => {
  const context = useContext(LibrarySettingsContext);
  if (!context) {
    throw new Error(
      "useLibrarySettings must be used within a LibrarySettingsProvider."
    );
  }

  return context;
};
