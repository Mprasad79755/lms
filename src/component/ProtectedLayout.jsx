import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { useLibrarySettings } from "../context/useLibrarySettings";

const ProtectedLayout = () => {
  const { isAuthenticated, logout } = useAuth();
  const { settings } = useLibrarySettings();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <>
      <header className="app-navbar">
        <div className="app-navbar-inner">
          <NavLink className="navbar-brand app-brand" to="/" aria-label={`${settings.libraryName} home`}>
            <span className="app-brand-icon" aria-hidden="true">
              <i className="bi bi-book-half" />
            </span>
            <span>{settings.libraryName}</span>
          </NavLink>

          <nav className="app-nav-links" aria-label="Main navigation">
            <NavLink to="/" end className="app-nav-link">
              Overview
            </NavLink>
            <NavLink to="/list-books" className="app-nav-link">
              Books
            </NavLink>
            <NavLink to="/add-book" className="app-nav-link">
              Add a book
            </NavLink>
            <NavLink to="/issue-book" className="app-nav-link">
              Issue Book
            </NavLink>
            <NavLink to="/return-book" className="app-nav-link">
              Return Book
            </NavLink>
            <NavLink to="/settings" className="app-nav-link">
              Settings
            </NavLink>
          </nav>

          <button
            type="button"
            className="btn btn-outline-secondary btn-sm app-logout"
            onClick={logout}
          >
            <i className="bi bi-box-arrow-right me-2" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </header>
      <Outlet />
      <footer className="app-footer">
        <div className="app-footer-inner">
          <div>
            <strong>{settings.libraryName}</strong>
            {settings.description && <p>{settings.description}</p>}
          </div>
          <div className="app-footer-details">
            {settings.address && (
              <span>
                <i className="bi bi-geo-alt me-2" aria-hidden="true" />
                {settings.address}
              </span>
            )}
            {settings.openingHours && (
              <span>
                <i className="bi bi-clock me-2" aria-hidden="true" />
                {settings.openingHours}
              </span>
            )}
            {settings.email && (
              <a href={`mailto:${settings.email}`}>
                <i className="bi bi-envelope me-2" aria-hidden="true" />
                {settings.email}
              </a>
            )}
            {settings.phone && (
              <a href={`tel:${settings.phone}`}>
                <i className="bi bi-telephone me-2" aria-hidden="true" />
                {settings.phone}
              </a>
            )}
            {settings.website && (
              <a href={settings.website} target="_blank" rel="noreferrer">
                <i className="bi bi-globe me-2" aria-hidden="true" />
                {settings.website}
              </a>
            )}
          </div>
        </div>
      </footer>
    </>
  );
};

export default ProtectedLayout;
