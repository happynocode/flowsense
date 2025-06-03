
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Header from "./components/layout/Header";
import MobileNav from "./components/layout/MobileNav";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Sources from "./pages/Sources";
import Digests from "./pages/Digests";
import DigestDetail from "./pages/DigestDetail";
import Subscription from "./pages/Subscription";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <div className="min-h-screen bg-gray-50">
            <Header />
            <div className="md:hidden fixed top-4 left-4 z-50">
              <MobileNav />
            </div>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              } />
              <Route path="/sources" element={
                <ProtectedRoute>
                  <Sources />
                </ProtectedRoute>
              } />
              <Route path="/digests" element={
                <ProtectedRoute>
                  <Digests />
                </ProtectedRoute>
              } />
              <Route path="/digests/:id" element={
                <ProtectedRoute>
                  <DigestDetail />
                </ProtectedRoute>
              } />
              <Route path="/subscription" element={
                <ProtectedRoute>
                  <Subscription />
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
