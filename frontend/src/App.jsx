// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import Navbar from './components/Navbar';
import { LoginPage, RegisterPage } from './pages/Auth';
import Discover     from './pages/Discover';
import Connections  from './pages/Connections';
import Groups       from './pages/Groups';
import Profile      from './pages/Profile';

// Wraps routes that require authentication.
// If the user isn't logged in, redirect to /login.
// Shows nothing while we're checking the session (loading state).
function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user)   return <Navigate to="/login" replace />;
  return children;
}

function Layout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes — all behind auth */}
          <Route path="/discover" element={
            <Protected>
              <Layout><Discover /></Layout>
            </Protected>
          } />
          <Route path="/connections" element={
            <Protected>
              <Layout><Connections /></Layout>
            </Protected>
          } />
          <Route path="/groups" element={
            <Protected>
              <Layout><Groups /></Layout>
            </Protected>
          } />
          <Route path="/profile" element={
            <Protected>
              <Layout><Profile /></Layout>
            </Protected>
          } />

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/discover" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
