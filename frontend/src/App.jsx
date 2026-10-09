import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Background3D from './components/Background3D';
import { AnimatePresence } from 'framer-motion';
import { Activity } from 'lucide-react';

const Login = lazy(() => import('./components/Login'));
const Register = lazy(() => import('./components/Register'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const History = lazy(() => import('./components/History'));

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

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-[#030712] text-gray-200 relative overflow-hidden">
        <Background3D />
        <div className="relative z-10 flex-grow flex flex-col pointer-events-none">
          <div className="pointer-events-auto">
            <Navbar />
          </div>
          <main className="flex-grow flex flex-col pointer-events-auto">
            <Suspense fallback={<PageLoader />}>
              <AnimatePresence mode="wait">
                <Routes>
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
                  <Route path="/" element={<Navigate to="/dashboard" />} />
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
