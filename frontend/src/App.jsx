import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import { AnimatePresence } from 'framer-motion';
import { Activity } from 'lucide-react';

const Background3D = lazy(() => import('./components/Background3D'));
const Login = lazy(() => import('./components/Login'));
const Register = lazy(() => import('./components/Register'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const History = lazy(() => import('./components/History'));
const Home = lazy(() => import('./components/Home'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));

function PageLoader() {
  return (
    <div className="flex-grow flex items-center justify-center min-h-[50vh]">
      <Activity className="animate-spin text-cyan-500" size={36} />
    </div>
  );
}

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  if (!token) return <Navigate to="/login" />;
  if (role !== 'admin') return <Navigate to="/dashboard" />;
  return children;
}

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-[#030712] text-gray-200 relative overflow-hidden">
        <Suspense fallback={<div className="absolute inset-0 bg-[#030712] pointer-events-none" />}>
          <Background3D />
        </Suspense>
        <div className="relative z-10 flex-grow flex flex-col pointer-events-none">
          <div className="pointer-events-auto">
            <Navbar />
          </div>
          <main className="flex-grow flex flex-col pointer-events-auto">
            <Suspense fallback={<PageLoader />}>
              <AnimatePresence mode="wait">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/dashboard" element={
                    <PrivateRoute>
                      <Dashboard />
                    </PrivateRoute>
                  } />
                  <Route path="/history" element={
                    <PrivateRoute>
                      <History />
                    </PrivateRoute>
                  } />
                  <Route path="/admin" element={
                    <AdminRoute>
                      <AdminDashboard />
                    </AdminRoute>
                  } />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </AnimatePresence>
            </Suspense>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
