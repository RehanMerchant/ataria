import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import TopMenu from '../containers/TopMenu';

export default function ProtectedRoute() {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return(
    <main className='flex flex-col'>
      <TopMenu/>
      <Outlet/>
    </main>
  );
}