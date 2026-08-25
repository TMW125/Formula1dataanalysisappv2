import { isRouteErrorResponse, useRouteError } from "react-router";
import { ErrorState } from "../components/AsyncState";

function routeErrorMessage(error: unknown) {
  if (isRouteErrorResponse(error)) {
    return `${error.status} ${error.statusText || "Route error"}`;
  }
  return error instanceof Error ? error.message : "An unexpected application error occurred.";
}

export function RouteErrorBoundary() {
  const error = useRouteError();
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <ErrorState
        title="This page could not be displayed"
        message={routeErrorMessage(error)}
        onRetry={() => window.location.reload()}
        retryLabel="Reload application"
      />
    </main>
  );
}
