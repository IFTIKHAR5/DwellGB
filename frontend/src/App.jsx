// App.jsx — providers + routes (pages are code-split and loaded on demand).
import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from 'sonner';
import { motion } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { RealtimeProvider } from './context/RealtimeContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import { PageLoader } from './components/ui/Spinner';
import ErrorBoundary from './components/ErrorBoundary';
import VerificationGate from './components/VerificationGate';
import Chatbot from './components/Chatbot'; // Chatbot import kiya gaya hai

const Home = lazy(() => import('./pages/Home'));
const Contact = lazy(() => import('./pages/Contact'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const VerifyIdentity = lazy(() => import('./pages/VerifyIdentity'));
const AdminVerifications = lazy(() => import('./pages/admin/AdminVerifications'));
const Listings = lazy(() => import('./pages/Listings'));
const ListingDetail = lazy(() => import('./pages/ListingDetail'));
const CreateListing = lazy(() => import('./pages/CreateListing'));
const OwnerDashboard = lazy(() => import('./pages/OwnerDashboard'));
const OwnerListings = lazy(() => import('./pages/OwnerListings'));
const OwnerBookings = lazy(() => import('./pages/OwnerBookings'));
const MyBookings = lazy(() => import('./pages/MyBookings'));
const SavedListings = lazy(() => import('./pages/SavedListings'));
const Messages = lazy(() => import('./pages/Messages'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Profile = lazy(() => import('./pages/Profile'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const NotFound = lazy(() => import('./pages/NotFound'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminListings = lazy(() => import('./pages/admin/AdminListings'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));
const AdminBroadcast = lazy(() => import('./pages/admin/AdminBroadcast'));

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function DashboardHome() {
  const { user } = useAuth();
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  return user?.role === 'owner' ? <OwnerDashboard /> : <Navigate to="/dashboard/requests" replace />;
}

function Requests() {
  const { user } = useAuth();
  return user?.role === 'owner' ? <OwnerBookings /> : <MyBookings />;
}

/** Pages with the site footer. Full-height apps (messages, map search) skip it. */
function WithFooter() {
  return (
    <>
      <Outlet />
      <Footer />
    </>
  );
}

function Shell() {
  const { isRtl } = useLanguage();
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-[200] btn btn-dark">Skip to content</a>
      <Navbar />
      <main id="main" className="flex-1">
        <ErrorBoundary key={pathname}>
          {/* Soft fade whenever you move to a different part of the site (opacity only, so sticky/fixed elements keep working) */}
          <motion.div
            key={pathname.split('/')[1] || 'home'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
          >
          <Suspense fallback={<PageLoader />}>
            <VerificationGate>
            <Routes>
              {/* Login and sign-up fill the screen, so no footer */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              <Route element={<WithFooter />}>
                <Route path="/" element={<Home />} />
                <Route path="/listings/:id" element={<ListingDetail />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/users/:id" element={<PublicProfile />} />
                <Route path="/verify-identity" element={<ProtectedRoute role="owner"><VerifyIdentity /></ProtectedRoute>} />

                <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                  <Route path="/dashboard" element={<DashboardHome />} />
                  <Route path="/dashboard/listings" element={<ProtectedRoute role="owner"><OwnerListings /></ProtectedRoute>} />
                  <Route path="/dashboard/requests" element={<Requests />} />
                  <Route path="/dashboard/saved" element={<ProtectedRoute role="tenant"><SavedListings /></ProtectedRoute>} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/settings" element={<Profile />} />
                </Route>
                <Route path="/dashboard/listings/new" element={<ProtectedRoute role="owner"><CreateListing /></ProtectedRoute>} />
                <Route path="/dashboard/listings/:id/edit" element={<ProtectedRoute role="owner"><CreateListing /></ProtectedRoute>} />

                {/* old URLs from v1 */}
                <Route path="/profile" element={<Navigate to="/settings" replace />} />
                <Route path="/my-bookings" element={<Navigate to="/dashboard/requests" replace />} />
                <Route path="/owner/*" element={<Navigate to="/dashboard" replace />} />

                <Route path="*" element={<NotFound />} />
              </Route>

              <Route path="/listings" element={<Listings />} />
              <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
                <Route index element={<AdminOverview />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="listings" element={<AdminListings />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="verifications" element={<AdminVerifications />} />
                <Route path="broadcast" element={<AdminBroadcast />} />
              </Route>
              <Route path="/messages/:id" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            </Routes>
            </VerificationGate>
          </Suspense>
          </motion.div>
        </ErrorBoundary>
      </main>
      
      {/* Chatbot ko yahan add kiya gaya hai */}
      <Chatbot />
      
      <Toaster position={isRtl ? 'top-left' : 'top-right'} richColors closeButton dir={isRtl ? 'rtl' : 'ltr'} toastOptions={{ style: { fontFamily: 'inherit' } }} />
    </div>
  );
}

export default function App() {
  const tree = (
    <BrowserRouter>
      <ScrollToTop />
      <LanguageProvider>
        <AuthProvider>
          <RealtimeProvider>
            <Shell />
          </RealtimeProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
  return GOOGLE_CLIENT_ID ? <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{tree}</GoogleOAuthProvider> : tree;
}