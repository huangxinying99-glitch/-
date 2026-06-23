import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import { getBasePath } from './lib/base-path';

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
  </Routes>
);

const App = () => (
  <TooltipProvider>
    <Toaster />
    <BrowserRouter basename={getBasePath()}>
      <AppRoutes />
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
export { AppRoutes };
