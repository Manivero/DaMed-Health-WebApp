import { Component } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

// Классовый компонент не может использовать хуки — тексты вынесены в функциональный ErrorFallback.
function ErrorFallback({ onHome }) {
  const { t } = useTranslation();
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "60vh", textAlign: "center",
      padding: "40px 24px", gap: 16,
    }}>
      <div style={{ fontSize: 56 }}>⚠️</div>
      <h2 style={{ fontFamily: "var(--font-head)", fontSize: 26, color: "var(--navy)", fontWeight: 400 }}>
        {t("errorBoundary.title")}
      </h2>
      <p style={{ color: "var(--muted)", maxWidth: 360, fontSize: 14 }}>
        {t("errorBoundary.message")}
      </p>
      <div style={{ display: "flex", gap: 12 }}>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          {t("errorBoundary.reload")}
        </button>
        <Link to="/" className="btn btn-ghost" onClick={onHome}>
          {t("errorBoundary.home")}
        </Link>
      </div>
    </div>
  );
}

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return <ErrorFallback onHome={() => this.setState({ hasError: false })} />;
  }
}
