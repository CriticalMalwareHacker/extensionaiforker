import React, { Component, ErrorInfo, ReactNode } from "react";
import { RotateCcw, AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[Forkline ErrorBoundary] Uncaught render error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetAll = async () => {
    if (confirm("Reset local Forkline database and reload? This clears branch cache.")) {
      try {
        indexedDB.deleteDatabase("ForklineDB");
      } catch (e) {
        console.error(e);
      }
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#151515",
            color: "#f0f0f0",
            padding: "24px",
            textAlign: "center",
            fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              color: "#ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px",
            }}
          >
            <AlertTriangle size={24} />
          </div>

          <h2 style={{ fontSize: "16px", fontWeight: "650", margin: "0 0 8px 0" }}>
            Something went wrong loading Forkline
          </h2>

          <p
            style={{
              fontSize: "12px",
              color: "#9ca3af",
              maxWidth: "280px",
              lineHeight: "1.5",
              margin: "0 0 16px 0",
              wordBreak: "break-word",
            }}
          >
            {this.state.error?.message || "An unexpected error occurred while rendering the interface."}
          </p>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={this.handleReload}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "#ffffff",
                color: "#000000",
                border: "none",
                borderRadius: "999px",
                padding: "8px 16px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              <RotateCcw size={13} />
              Reload Interface
            </button>

            <button
              onClick={this.handleResetAll}
              style={{
                backgroundColor: "transparent",
                color: "#ef4444",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                borderRadius: "999px",
                padding: "8px 14px",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              Reset Cache
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
