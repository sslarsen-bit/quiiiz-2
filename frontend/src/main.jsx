import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { FeatureFlagProvider } from './contexts/FeatureFlagContext';
import App from './App';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <FeatureFlagProvider>
          <App />
        </FeatureFlagProvider>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
);
