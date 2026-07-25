import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/login';
import Home from './pages/home';
import Profile from './pages/profile';
import ProtectedRoute from './components/ProtectedRoute'; // Adjust path if needed
import { useInitAuth } from './hooks/useInitAuth';
import { useAuthStore } from './store/useAuthStore';
import Watchlist from './pages/watchlist';
import WatchlistPage from './pages/watchlist/slug';
import Instrument from './pages/instrument';
// import Register from './pages/register';

function AppContent() {
  useInitAuth(); 

  const { user, isInitialized } = useAuthStore();
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes - Redirect to Home if already logged in */}
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      {/* <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} /> */}

      {/* Protected Routes Wrapper */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Home />} />
        <Route path="/watchlist" element={<Watchlist/>}>
        <Route path="/watchlist:slug" element={<WatchlistPage/>} />
        </Route>
        <Route path='/instrument/:slug' element={<Instrument/>}/>
        <Route path="/profile" element={<Profile />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}