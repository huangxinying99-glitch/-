import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
  </Routes>
);

const App = () => (
  <TooltipProvider>
    <Toaster />
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
export { AppRoutes };
