
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
console.log('Index.tsx: Finding root element...', rootElement);

if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

console.log('Index.tsx: Creating root...');
const root = ReactDOM.createRoot(rootElement);

console.log('Index.tsx: Rendering App...');
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
