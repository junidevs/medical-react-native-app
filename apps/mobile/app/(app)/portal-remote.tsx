// Demo route for the Portal micro-frontend (Faza 1b).
//
// Hidden route (href:null in the tab layout). Under the Re.Pack build it renders
// the federated Portal remote; under the Metro build (or on network failure) it
// falls back to the built-in version. Crashes are isolated by the shared
// RouteErrorBoundary and reported to Sentry tagged with this route.
import { RemotePortal } from "@/repack/remote-portal";

export default function PortalRemoteRoute() {
  return <RemotePortal />;
}

export { RouteErrorBoundary as ErrorBoundary } from "@/design/route-error-boundary";
