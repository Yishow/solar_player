import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type DataHubDraftGuardValue = {
  isDirty: boolean;
  requestNavigation: (proceed: () => void) => boolean;
  setDirty: (value: boolean) => void;
};

const defaultConfirmDiscard = () => window.confirm("尚有未儲存的修改，繼續會捨棄目前輸入，確定要繼續嗎？");

const DataHubDraftGuardContext = createContext<DataHubDraftGuardValue>({
  isDirty: false,
  requestNavigation: (proceed) => {
    proceed();
    return true;
  },
  setDirty: () => undefined
});

export function DataHubDraftGuardProvider({
  children,
  confirmDiscard = defaultConfirmDiscard
}: {
  children: ReactNode;
  confirmDiscard?: () => boolean;
}) {
  const [isDirty, setDirty] = useState(false);
  const requestNavigation = useCallback((proceed: () => void) => {
    if (isDirty && !confirmDiscard()) {
      return false;
    }
    proceed();
    return true;
  }, [confirmDiscard, isDirty]);
  const value = useMemo(
    () => ({ isDirty, requestNavigation, setDirty }),
    [isDirty, requestNavigation]
  );

  return (
    <DataHubDraftGuardContext.Provider value={value}>
      {children}
    </DataHubDraftGuardContext.Provider>
  );
}

export function useDataHubDraftGuard() {
  return useContext(DataHubDraftGuardContext);
}
