import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
ReactDOM.createRoot(document.getElementById('root')).render(
  <ClerkProvider publishableKey={key} afterSignOutUrl="/" signInFallbackRedirectUrl="/app" signUpFallbackRedirectUrl="/app">
    <BrowserRouter>
      <App />
      <Toaster position="top-right" />
    </BrowserRouter>
  </ClerkProvider>
);
