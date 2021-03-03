// @flow

import React, { useState, useMemo } from "react";
import type { ToastData } from "./types";

type Props = {
  children: React$Node,
};

type ToastContextApi = {
  dismissToast: (string) => void,
  pushToast: (ToastData) => void,
};

type ToastContextState = {
  toasts: ToastData[],
};

type ToastContextType = ToastContextApi & ToastContextState;

export const ToastContext = React.createContext<ToastContextType>({});

export function ToastProvider({ children }: Props) {
  const [toasts, setToasts] = useState([]);

  const api = useMemo(
    () => ({
      dismissToast: (id: string) => {
        setToasts((currentToasts) =>
          currentToasts.filter((item) => item.id !== id)
        );
      },
      pushToast: (newToast: ToastData) => {
        setToasts((currentToasts) => [...currentToasts, newToast]);
      },
    }),
    []
  );

  const value = {
    toasts,
    ...api,
  };
  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
}
