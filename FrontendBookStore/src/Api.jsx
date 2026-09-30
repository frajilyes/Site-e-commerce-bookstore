import React, { useEffect, useState } from "react";
import httpClient from "./services/httpClient";

import Seo from "./Components/Seo";
const RESOURCES = [
  "books",
  "books/featured",
  "books/best-sellers",
  "books/categories",
  "auth/me",
  "orders/my",
  "carts/me",
  "wishlists/me",
  "payments/my",
  "reviews",
];

const ApiExplorer = () => {
  const [data, setData] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all(
      RESOURCES.map((resource) =>
        httpClient
          .get(`/${resource}`, { signal: controller.signal })
          .then(({ data: payload }) => [resource, payload, null])
          .catch((error) => [resource, null, error.message]),
      ),
    ).then((results) => {
      if (controller.signal.aborted) return;
      const nextData = {};
      const nextErrors = {};
      results.forEach(([resource, payload, error]) => {
        if (error) nextErrors[resource] = error;
        else nextData[resource] = payload;
      });
      setData(nextData);
      setErrors(nextErrors);
      setLoading(false);
    });

    return () => controller.abort();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <Seo title="API explorer" path="/api" noindex />
      <h1 className="mb-8 text-3xl font-bold">API explorer</h1>

      {loading && <p className="text-slate-400">Loading resources…</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        {RESOURCES.map((resource) => (
          <section
            key={resource}
            className="rounded-2xl border border-white/10 bg-slate-900/70 p-5"
          >
            <h2 className="mb-3 text-lg font-semibold uppercase tracking-[0.18em] text-cyan-300">
              /{resource}
            </h2>
            {errors[resource] ? (
              <p className="text-sm text-rose-400">{errors[resource]}</p>
            ) : (
              <pre className="max-h-72 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-300">
                {JSON.stringify(data[resource] ?? [], null, 2)}
              </pre>
            )}
          </section>
        ))}
      </div>
    </div>
  );
};

export default ApiExplorer;
