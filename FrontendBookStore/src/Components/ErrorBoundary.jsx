import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Unhandled UI error:", error, info?.componentStack);
    }
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-slate-950 px-6 py-24 text-center text-slate-100">
        <span className="text-5xl">📕</span>
        <h1 className="text-3xl font-bold">Something went wrong</h1>
        <p className="max-w-md text-slate-400">
          The page could not be displayed. You can retry, or go back to the
          store home page.
        </p>
        {process.env.NODE_ENV !== "production" && (
          <pre className="max-w-full overflow-x-auto rounded-xl bg-slate-900 p-4 text-left text-xs text-rose-300">
            {String(error?.message || error)}
          </pre>
        )}
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={this.handleReset}
            className="rounded-2xl bg-cyan-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-2xl border border-slate-700 px-6 py-3 font-semibold text-slate-200 transition hover:border-cyan-400"
          >
            Back to home
          </a>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
