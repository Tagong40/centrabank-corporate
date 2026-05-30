import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import Transfer from './pages/Transfer';
import Cards from './pages/Cards';
import Investments from './pages/Investments';
import Resources from './pages/Resources';
import Settings from './pages/Settings';
import Onboarding from './pages/Onboarding';
import CookieBanner from './components/CookieBanner';

const ProtectedRoute = ({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) => {
  const { user, loading, isAdmin, needsOnboarding } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  if (!user) return <Navigate to="/login" />;
  if (needsOnboarding) return <Navigate to="/onboarding" />;
  if (requireAdmin && !isAdmin) return <Navigate to="/" />;

  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/resources" element={<Resources />} />
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/transfer" 
                element={
                  <ProtectedRoute>
                    <Transfer />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/cards" 
                element={
                  <ProtectedRoute>
                    <Cards />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/investments" 
                element={
                  <ProtectedRoute>
                    <Investments />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
          <CookieBanner />
        </div>
      </Router>
    </AuthProvider>
  );
}
