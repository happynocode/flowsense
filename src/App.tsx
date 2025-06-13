import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import Header from "./components/layout/Header";
import MobileNav from "./components/layout/MobileNav";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import Login from "./pages/Login";

import Sources from "./pages/Sources";
import Digests from "./pages/Digests";
import DigestDetail from "./pages/DigestDetail";
import Subscription from "./pages/Subscription";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import DebugSubscription from "./pages/DebugSubscription";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename="/digest-flow-daily">
        <AuthProvider>
          <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
            <Header />
            <div className="md:hidden fixed top-4 left-4 z-50">
              <MobileNav />
            </div>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Index />} />
              <Route path="/sources" element={<Sources />} />
              <Route path="/digests" element={<Digests />} />
              <Route path="/digests/:id" element={<DigestDetail />} />
              <Route path="/subscription" element={<Subscription />} />
              <Route path="/subscription/success" element={<SubscriptionSuccess />} />
              <Route path="/debug-subscription" element={<DebugSubscription />} />
              <Route path="/profile" element={<NotFound />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;