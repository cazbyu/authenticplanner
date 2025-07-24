import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';

import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';

// Find the root element in the HTML
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Failed to find the root element");
}

// Create a root for the React application
const root = createRoot(rootElement);

// Render the application
root.render(
  <StrictMode>
    <BrowserRouter>
      {/* AuthProvider makes user session data available to all components */}
      <AuthProvider>
        <App />
        {/* Toaster provides a global notification system */}
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
