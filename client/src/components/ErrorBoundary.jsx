import { Component } from "react";
import { Link } from "react-router-dom";

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
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", minHeight: "60vh", textAlign: "center",
        padding: "40px 24px", gap: 16,
      }}>
        <div style={{ fontSize: 56 }}>⚠️</div>
        <h2 style={{ fontFamily: "var(--font-head)", fontSize: 26, color: "var(--navy)", fontWeight: 400 }}>
          Что-то пошло не так
        </h2>
        <p style={{ color: "var(--muted)", maxWidth: 360, fontSize: 14 }}>
          Произошла непредвиденная ошибка. Попробуйте обновить страницу или вернуться на главную.
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Обновить страницу
          </button>
          <Link to="/" className="btn btn-ghost" onClick={() => this.setState({ hasError: false })}>
            На главную
          </Link>
        </div>
      </div>
    );
  }
}
