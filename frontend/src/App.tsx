import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import AppLayout from './components/Layout/AppLayout';
import LoginPage from './pages/LoginPage';
import SpacePage from './pages/SpacePage';
import PageViewPage from './pages/PageViewPage';
import AdminPage from './pages/AdminPage';
import { useAuthStore } from './stores/authStore';

function App() {
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    useAuthStore.getState().initialize();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={!isAuthenticated ? <LoginPage /> : <Navigate to="/s/default" replace />}
        />
        <Route
          path="/s/:spaceSlug"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<SpacePage />} />
        </Route>
        <Route
          path="/s/:spaceSlug/p/:pageId"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<PageViewPage />} />
        </Route>
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminPage />} />
        </Route>
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/s/default" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
