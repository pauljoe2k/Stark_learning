import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '../layouts/AppShell';
import { AuthLayout } from '../layouts/AuthLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';

// Lazy-loaded page components for fast initial load
const HomePage = lazy(() => import('../pages/HomePage'));
const TopicsListPage = lazy(() => import('../pages/TopicsListPage'));
const TopicUploadPage = lazy(() => import('../pages/TopicUploadPage'));
const TopicDetailPage = lazy(() => import('../pages/TopicDetailPage'));
const ExplainRecordPage = lazy(() => import('../pages/ExplainRecordPage'));
const ExplainResultPage = lazy(() => import('../pages/ExplainResultPage'));
const PalaceGridPage = lazy(() => import('../pages/PalaceGridPage'));
const PalaceNewPage = lazy(() => import('../pages/PalaceNewPage'));
const PalaceViewPage = lazy(() => import('../pages/PalaceViewPage'));
const RecallSetupPage = lazy(() => import('../pages/RecallSetupPage'));
const RecallRoundPage = lazy(() => import('../pages/RecallRoundPage'));
const RecallSummaryPage = lazy(() => import('../pages/RecallSummaryPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const LoginPage = lazy(() => import('../pages/LoginPage'));
const SignupPage = lazy(() => import('../pages/SignupPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

function SuspenseFallback() {
  return (
    <div className="min-h-[60vh] w-full flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

export const router = createBrowserRouter([
  // Auth Routes
  {
    element: <AuthLayout />,
    children: [
      {
        path: '/login',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <LoginPage />
          </Suspense>
        ),
      },
      {
        path: '/signup',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <SignupPage />
          </Suspense>
        ),
      },
    ],
  },
  // Authenticated AppShell Routes
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <HomePage />
          </Suspense>
        ),
      },
      {
        path: 'topics',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <TopicsListPage />
          </Suspense>
        ),
      },
      {
        path: 'topics/new',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <TopicUploadPage />
          </Suspense>
        ),
      },
      {
        path: 'topics/:topicId',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <TopicDetailPage />
          </Suspense>
        ),
      },
      {
        path: 'explain',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <ExplainRecordPage />
          </Suspense>
        ),
      },
      {
        path: 'topics/:topicId/explain',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <ExplainRecordPage />
          </Suspense>
        ),
      },
      {
        path: 'topics/:topicId/explain/:explanationId',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <ExplainResultPage />
          </Suspense>
        ),
      },
      {
        path: 'palace',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <PalaceGridPage />
          </Suspense>
        ),
      },
      {
        path: 'palace/new',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <PalaceNewPage />
          </Suspense>
        ),
      },
      {
        path: 'palace/:placeId',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <PalaceViewPage />
          </Suspense>
        ),
      },
      {
        path: 'recall',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <RecallSetupPage />
          </Suspense>
        ),
      },
      {
        path: 'recall/:roundId',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <RecallRoundPage />
          </Suspense>
        ),
      },
      {
        path: 'recall/:roundId/summary',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <RecallSummaryPage />
          </Suspense>
        ),
      },
      {
        path: 'calendar',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <HomePage />
          </Suspense>
        ),
      },
      {
        path: 'settings',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <SettingsPage />
          </Suspense>
        ),
      },
      {
        path: '*',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <NotFoundPage />
          </Suspense>
        ),
      },
    ],
  },
]);

