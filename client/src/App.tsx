import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import ScriptStudio from "./pages/ScriptStudio";
import DashboardLayout from "./components/DashboardLayout";
import Research from "./pages/Research";
import AssetLibrary from "./pages/AssetLibrary";
import Copilot from "./pages/Copilot";
import TimelineEditor from "./pages/TimelineEditor";
import VoiceCaptions from "./pages/VoiceCaptions";
import Jobs from "./pages/Jobs";
import Workspace from "./pages/Workspace";
import FoundationPage from "./pages/FoundationPage";
import Publishing from "./pages/Publishing";
import ProviderRegistry from "./pages/ProviderRegistry";

function Router() {
  return (
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
      <Route path={"/workspace"} component={Workspace} />
      <Route path={"/publish"} component={Publishing} />
      <Route path={"/analytics"}><FoundationPage eyebrow="Intelligence" title="Analytics workspace" description="Performance records are designed to ingest only official platform data. Connect approved accounts to begin synchronizing verified views, watch time, engagement, and publication state." /></Route>
      <Route path={"/settings"} component={ProviderRegistry} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch></DashboardLayout>
  );
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
