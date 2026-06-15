import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login    from './pages/Login';
import Signup   from './pages/Signup';
import Dashboard from './pages/Dashboard';
import JournalEntry from './pages/JournalEntry';
import Feedback from './pages/Feedback';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import Interactive3DBG from './components/Interactive3DBG';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <Interactive3DBG />
      <BrowserRouter>
        <Routes>
          <Route path="/"        element={<Navigate to="/dashboard" />} />
          <Route path="/login"   element={<Login />} />
          <Route path="/signup"  element={<Signup />} />
          <Route path="/dashboard" element={
            <PrivateRoute><Dashboard /></PrivateRoute>
          } />
          <Route path="/journal" element={
            <PrivateRoute><JournalEntry /></PrivateRoute>
          } />
          <Route path="/feedback" element={
            <PrivateRoute><Feedback /></PrivateRoute>
          } />
          <Route path="/analytics" element={
            <PrivateRoute><Analytics /></PrivateRoute>
          } />
          <Route path="/profile" element={
            <PrivateRoute><Profile /></PrivateRoute>
          } />
          <Route
            path="/forgot-password"
            element={<ForgotPassword />}
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;