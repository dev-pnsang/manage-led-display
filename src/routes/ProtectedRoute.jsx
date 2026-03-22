import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { hasAuthSession } from '../services/storage';
import { DevicesProvider } from '../context/DevicesContext.jsx';

export default function ProtectedRoute() {
  const location = useLocation();

  if (!hasAuthSession()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <DevicesProvider>
      <Outlet />
    </DevicesProvider>
  );
}
