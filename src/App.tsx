import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";

import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AddQuestion from "./pages/AddQuestion";
import MyQuestions from "./pages/MyQuestions";
import QuestionDetail from "./pages/QuestionDetail";
import PublicQuestion from "./pages/PublicQuestion";
import PublicFeed from "./pages/PublicFeed";
import Notes from "./pages/Notes";
import Revision from "./pages/Revision";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const Protected = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <AppLayout>{children}</AppLayout>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
              <Route path="/add" element={<Protected><AddQuestion /></Protected>} />
              <Route path="/edit/:id" element={<Protected><AddQuestion /></Protected>} />
              <Route path="/questions" element={<Protected><MyQuestions /></Protected>} />
              <Route path="/questions/:id" element={<Protected><QuestionDetail /></Protected>} />
              <Route path="/share/:id" element={<PublicQuestion />} />
              <Route path="/public" element={<Protected><PublicFeed /></Protected>} />
              <Route path="/notes" element={<Protected><Notes /></Protected>} />
              <Route path="/revision" element={<Protected><Revision /></Protected>} />
              <Route path="/settings" element={<Protected><Settings /></Protected>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
