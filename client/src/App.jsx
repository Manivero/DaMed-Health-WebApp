import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ThemeProvider }        from "./context/ThemeContext";
import { ToastProvider }        from "./context/ToastContext";
import { FavoritesProvider }    from "./context/FavoritesContext";
import { NotificationsProvider } from "./context/NotificationsContext";
import ErrorBoundary    from "./components/ErrorBoundary";
import TopNav           from "./components/TopNav";
import BottomNav        from "./components/BottomNav";
import ProtectedRoute   from "./components/ProtectedRoute";
import AIChat           from "./components/AIChat";

import Home           from "./pages/Home";
import Login          from "./pages/Login";
import Register       from "./pages/Register";
import Doctors        from "./pages/Doctors";
import DoctorPage     from "./pages/DoctorPage";
import Booking        from "./pages/Booking";
import Appointments   from "./pages/Appointments";
import Profile        from "./pages/Profile";
import Admin          from "./pages/Admin";
import Favorites      from "./pages/Favorites";
import Notifications  from "./pages/Notifications";
import Consultation   from "./pages/Consultation";
import MedCard        from "./pages/MedCard";
import { Success, Cancel, Download, NotFound } from "./pages/misc";

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public */}
        <Route path="/"               element={<Home />}         />
        <Route path="/login"          element={<Login />}        />
        <Route path="/register"       element={<Register />}     />
        <Route path="/doctors"        element={<Doctors />}      />
        <Route path="/doctors/:id"    element={<DoctorPage />}   />
        <Route path="/consultation"   element={<Consultation />} />
        <Route path="/download"       element={<Download />}     />
        <Route path="/success"        element={<Success />}      />
        <Route path="/cancel"         element={<Cancel />}       />

        {/* Protected */}
        <Route path="/booking/:id"    element={<ProtectedRoute><Booking /></ProtectedRoute>}      />
        <Route path="/appointments"   element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
        <Route path="/profile"        element={<ProtectedRoute><Profile /></ProtectedRoute>}      />
        <Route path="/admin"          element={<ProtectedRoute><Admin /></ProtectedRoute>}        />
        <Route path="/favorites"      element={<ProtectedRoute><Favorites /></ProtectedRoute>}    />
        <Route path="/notifications"  element={<ProtectedRoute><Notifications /></ProtectedRoute>}/>
        <Route path="/medcard"        element={<ProtectedRoute><MedCard /></ProtectedRoute>}      />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <NotificationsProvider>
        <FavoritesProvider>
          <ToastProvider>
            <BrowserRouter>
              <ErrorBoundary>
                <div className="app">
                  <TopNav />
                  <AnimatedRoutes />
                  <BottomNav />
                  <AIChat />
                </div>
              </ErrorBoundary>
            </BrowserRouter>
          </ToastProvider>
        </FavoritesProvider>
      </NotificationsProvider>
    </ThemeProvider>
  );
}
