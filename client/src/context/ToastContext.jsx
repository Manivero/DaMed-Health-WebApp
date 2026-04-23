import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ visible: false, msg: "" });
  const timerRef = useRef(null);

  const showToast = useCallback((msg) => {
    clearTimeout(timerRef.current);
    setToast({ visible: true, msg });
    timerRef.current = setTimeout(() => setToast({ visible: false, msg: "" }), 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className={"toast" + (toast.visible ? " show" : "")}>
        <span className="toast-dot" />
        {toast.msg}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
