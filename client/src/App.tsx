import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import React from "react";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import GuestQuickDraft from "./pages/GuestQuickDraft";

const DashboardLayout = React.lazy(() => import("./components/DashboardLayout"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const ScriptStudio = React.lazy(() => import("./pages/ScriptStudio"));
const Research = React.lazy(() => import("./pages/Research"));
const AssetLibrary = React.lazy(() => import("./pages/AssetLibrary"));
const Copilot = React.lazy(() => import("./pages/Copilot"));
const TimelineEditor = React.lazy(() => import("./pages/TimelineEditor"));
const VoiceCaptions = React.lazy(() => import("./pages/VoiceCaptions"));
const Jobs = React.lazy(() => import("./pages/Jobs"));
const Workspace = React.lazy(() => import("./pages/Workspace"));
const Operations = React.lazy(() => import("./pages/Operations"));
const FoundationPage = React.lazy(() => import("./pages/FoundationPage"));
const Publishing = React.lazy(() => import("./pages/Publishing"));
const ProviderRegistry = React.lazy(() => import("./pages/ProviderRegistry"));

function WorkspaceRouteLoadingFallback() {
  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground" role="status" aria-live="polite">
      <div className="mx-auto max-w-6xl animate-pulse rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Loading workspace…
      </div>
    </main>
  );
}

function WorkspaceRouter() {
  return (
    <React.Suspense fallback={<WorkspaceRouteLoadingFallback />}>
      <DashboardLayout><Switch>
        <Route path={"/"} component={Dashboard} />
        <Route path={"/projects"} component={Dashboard} />
        <Route path={"/studio"} component={ScriptStudio} />
        <Route path={"/research"} component={Research} />
        <Route path={"/assets"} component={AssetLibrary} />
        <Route path={"/editor"} component={TimelineEditor} />
        <Route path={"/voice"} component={VoiceCaptions} />
        <Route path={"/jobs"} component={Jobs} />
        <Route path={"/copilot"} component={Copilot} />
        <Route path="/workspace" component={Workspace} />
        <Route path="/operations" component={Operations} />
        <Route path={"/publish"} component={Publishing} />
        <Route path={"/analytics"}><FoundationPage eyebrow="Intelligence" title="Analytics workspace" description="Performance records are designed to ingest only official platform data. Connect approved accounts to begin synchronizing verified views, watch time, engagement, and publication state." /></Route>
        <Route path={"/settings"} component={ProviderRegistry} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch></DashboardLayout>
    </React.Suspense>
  );
}

function Router() {
  return <Switch>
    <Route path="/quick-draft" component={GuestQuickDraft} />
    <Route component={WorkspaceRouter} />
  </Switch>;
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
