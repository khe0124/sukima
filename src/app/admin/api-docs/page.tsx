import React from "react";
import type { Metadata } from "next";

import { buildOpenApiDocument } from "@/lib/openapi";

export const metadata: Metadata = {
  title: "API Docs"
};

export default function AdminApiDocsPage() {
  const document = buildOpenApiDocument();
  const operations = Object.entries(document.paths).flatMap(([path, methods]) =>
    Object.entries(methods).map(([method, operation]) => ({
      method: method.toUpperCase(),
      path,
      summary: operation.summary,
      tag: operation.tags[0] ?? "API"
    }))
  );
  const operationGroups = document.tags
    .map((tag) => ({
      ...tag,
      operations: operations.filter((operation) => operation.tag === tag.name)
    }))
    .filter((tag) => tag.operations.length > 0);

  return (
    <main className="shell api-docs-shell">
      <section className="page-heading">
        <p className="eyebrow">Admin</p>
        <h1>API Docs</h1>
        <p>
          Swagger-compatible OpenAPI documentation for the photo archive API.
        </p>
      </section>

      <section className="api-docs-card" aria-label="OpenAPI document">
        <div className="api-docs-card-header">
          <div>
            <h2>{document.info.title}</h2>
            <p>{document.info.description}</p>
          </div>
          <a className="button-link" href="/api/openapi.json">
            OpenAPI JSON
          </a>
        </div>
        <dl className="api-docs-metrics">
          <div>
            <dt>Version</dt>
            <dd>{document.openapi}</dd>
          </div>
          <div>
            <dt>Endpoints</dt>
            <dd>{operations.length}</dd>
          </div>
          <div>
            <dt>Auth</dt>
            <dd>Cookie</dd>
          </div>
        </dl>
      </section>

      <section className="api-docs-list" aria-label="API endpoints">
        {operationGroups.map((tag) => (
          <section className="api-docs-card api-docs-group" key={tag.name}>
            <div className="api-docs-section-header">
              <div>
                <h2>{tag.name}</h2>
                <p>{tag.description}</p>
              </div>
              <span>{tag.operations.length}</span>
            </div>
            <div className="api-docs-table" role="table" aria-label={`${tag.name} endpoints`}>
              <div className="api-docs-table-row api-docs-table-head" role="row">
                <span role="columnheader">Method</span>
                <span role="columnheader">Path</span>
                <span role="columnheader">Summary</span>
              </div>
              {tag.operations.map((operation) => (
                <div className="api-docs-table-row" role="row" key={`${operation.method}-${operation.path}`}>
                  <span className="api-docs-method" data-method={operation.method} role="cell">
                    {operation.method}
                  </span>
                  <code role="cell">{operation.path}</code>
                  <span role="cell">{operation.summary}</span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </section>
    </main>
  );
}
