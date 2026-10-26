"use client";

import { toast as hotToast, Toaster as HotToaster } from "react-hot-toast";

export const toast = {
  success: (message: string) =>
    hotToast.success(message, {
      style: {
        background: "#000000",
        color: "#ffffff",
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: "12px",
        borderRadius: "16px",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
      },
      iconTheme: {
        primary: "#10B981",
        secondary: "#000000",
      },
    }),

  error: (message: string) =>
    hotToast.error(message, {
      style: {
        background: "#000000",
        color: "#ffffff",
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: "12px",
        borderRadius: "16px",
        border: "1px solid rgba(246, 67, 2, 0.3)",
        boxShadow: "0 10px 30px rgba(246, 67, 2, 0.2)",
      },
      iconTheme: {
        primary: "#F64302",
        secondary: "#000000",
      },
    }),

  info: (message: string) =>
    hotToast(message, {
      style: {
        background: "#000000",
        color: "#ffffff",
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: "12px",
        borderRadius: "16px",
        border: "1px solid rgba(255, 255, 255, 0.15)",
      },
    }),
};

export function RehearseToaster() {
  return (
    <HotToaster
      position="bottom-right"
      toastOptions={{
        duration: 4000,
      }}
    />
  );
}
