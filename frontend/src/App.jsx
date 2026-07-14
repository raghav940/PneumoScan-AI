import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import History from './components/History';
import Background3D from './components/Background3D';
import { AnimatePresence } from 'framer-motion';

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
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
