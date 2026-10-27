import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { weaveQueryClient } from './lib/query-client';
import { AuthProvider } from './lib/auth';
import { LandingPage } from './features/landing/LandingPage';
import { LoginPage } from './features/auth/LoginPage';
import { VerifyPage } from './features/verification/VerifyPage';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { StudentsPage } from './features/students/StudentsPage';
import {
  ImportsListPage,
  CsvImportWizardPage,
  BatchValidationResultsPage,
} from './features/imports/ImportsPages';
import { DuplicatesPage } from './features/duplicates/DuplicatesPage';
import {
  IntakeMonitoringPage,
  InstitutionsPage,
  ProgramsPage,
} from './features/intake/IntakeAndDirectoryPages';
import {
  AuditTimelinePage,
  AssistantPage,
  SettingsPage,
} from './features/audit/AuditAndAssistantPages';
import { WeaveSpatialScene } from './features/spatial/WeaveSpatialScene';

export function App() {
  return (
    <QueryClientProvider client={weaveQueryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/verify/:token" element={<VerifyPage />} />

            {/* Full-Bleed 100vw x 100vh Three.js 3D Spatial Verification Apparatus */}
            <Route path="/app/topology" element={<WeaveSpatialScene />} />

            {/* Authenticated Workspace Routes */}
            <Route path="/app" element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="students" element={<StudentsPage />} />
              <Route path="imports" element={<ImportsListPage />} />
              <Route path="imports/new" element={<CsvImportWizardPage />} />
              <Route path="imports/:id" element={<BatchValidationResultsPage />} />
              <Route path="duplicates" element={<DuplicatesPage />} />
              <Route path="intake" element={<IntakeMonitoringPage />} />
              <Route path="institutions" element={<InstitutionsPage />} />
              <Route path="programs" element={<ProgramsPage />} />
              <Route path="audit" element={<AuditTimelinePage />} />
              <Route path="assistant" element={<AssistantPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
