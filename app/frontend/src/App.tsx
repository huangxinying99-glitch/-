import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import LevelEditor from './pages/LevelEditor';
import { getBasePath } from './lib/base-path';

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/editor" element={<LevelEditor />} />
  </Routes>
);

const App = () => (
  <TooltipProvider>
    <Toaster />
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  </TooltipProvider>
);

export default App;
export { AppRoutes };


