import { Navigate, useLocation } from 'react-router-dom';
import { getToken } from '../../utils/authUtils';

function ProtectedRoute({ role, redirectTo, children }) {
  const location = useLocation();
  const token = getToken(role);

  if (!token) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  return children;
}

export default ProtectedRoute;
