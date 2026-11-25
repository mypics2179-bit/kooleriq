import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { FirestoreErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <FirestoreErrorBoundary>
    <App />
  </FirestoreErrorBoundary>
);
