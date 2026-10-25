import { useCallback, useMemo, useState } from "react";
import LibrarySettingsContext from "./librarySettingsContext";
import { defaultLibrarySettings } from "./librarySettingsDefaults";

const readSettings = () => {
  try {
    const storedSettings = localStorage.getItem("librarySettings");
    if (!storedSettings) return defaultLibrarySettings;

    const parsedSettings = JSON.parse(storedSettings);
    if (!parsedSettings || typeof parsedSettings !== "object") {
      throw new Error("Stored library settings are not valid.");
    }

    return { ...defaultLibrarySettings, ...parsedSettings };
  } catch (error) {
    console.error("Unable to load library settings.", error);
    return defaultLibrarySettings;
  }
};

// eslint-disable-next-line react/prop-types
export const LibrarySettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(readSettings);

  const updateSettings = useCallback((updates) => {
    const updatedSettings = { ...settings, ...updates };
    localStorage.setItem("librarySettings", JSON.stringify(updatedSettings));
    setSettings(updatedSettings);
  }, [settings]);

  const value = useMemo(
    () => ({ settings, updateSettings }),
    [settings, updateSettings]
  );

  return (
    <LibrarySettingsContext.Provider value={value}>
      {children}
    </LibrarySettingsContext.Provider>
  );
};
