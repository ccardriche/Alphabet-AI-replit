import { createContext, useContext, useState } from "react";

interface SelectedClassContextValue {
  selectedClassId: string | null;
  setSelectedClassId: (id: string | null) => void;
}

const SelectedClassContext = createContext<SelectedClassContextValue>({
  selectedClassId: null,
  setSelectedClassId: () => {},
});

export function SelectedClassProvider({ children }: { children: React.ReactNode }) {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  return (
    <SelectedClassContext.Provider value={{ selectedClassId, setSelectedClassId }}>
      {children}
    </SelectedClassContext.Provider>
  );
}

export function useSelectedClass() {
  return useContext(SelectedClassContext);
}
