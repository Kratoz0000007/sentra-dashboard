import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './styles/app.css';
import { AppLayout } from './components/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { FallEventsPage, LiveEventsPage } from './pages/EventPages';
import { DevicePage } from './pages/DevicePage';
import { LocationPage } from './pages/LocationPage';
import { ContactsPage } from './pages/ContactsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage, SignupPage } from './pages/AuthPages';
import { SetupPage } from './pages/SetupPage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="events" element={<LiveEventsPage />} />
          <Route path="falls" element={<FallEventsPage />} />
          <Route path="device" element={<DevicePage />} />
          <Route path="location" element={<LocationPage />} />
          <Route path="contacts" element={<ContactsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
