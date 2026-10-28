// components/VerificationGate.jsx — sends owners who haven't uploaded their CNIC + selfie
// (or whose photos were rejected) to the verification page before they use their dashboard.
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { needsVerification } from '@/lib/verification';

const GATED = ['/dashboard', '/messages'];

export default function VerificationGate({ children }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  if (needsVerification(user) && GATED.some((p) => pathname.startsWith(p))) {
    return <Navigate to="/verify-identity" replace />;
  }
  return children;
}
