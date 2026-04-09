import React from 'react';
import ReactDOM from 'react-dom/client';

import { PopupSessionProvider } from '../../src/popup/context/PopupSessionContext';
import { PopupApp } from '../../src/popup/PopupApp';
import '../../src/styles/global.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Popup root element was not found.');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <PopupSessionProvider>
      <PopupApp />
    </PopupSessionProvider>
  </React.StrictMode>,
);
