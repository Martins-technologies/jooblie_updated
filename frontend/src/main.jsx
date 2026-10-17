import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'react-toastify/dist/ReactToastify.css';
import Notifications from './shared/components/Notifications';
import App from './App';
import { AuthProvider } from './shared/context/AuthContext';
import './shared/styles/global.css';
import './shared/styles/dashboardSurfaces.css';
import './shared/styles/typography.css';
import './shared/styles/statusChips.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
      <Notifications />
    </BrowserRouter>
  </React.StrictMode>,
);


import './shared/styles/brand.css';

import './shared/styles/brandTheme.css';

import './shared/styles/publicPolish.css';

import './shared/styles/visualExperience.css';

import './shared/styles/publicEditorial.css';
