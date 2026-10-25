import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/useAuth";
import { useLibrarySettings } from "../context/useLibrarySettings";

const Login = () => {
  const { isAuthenticated, login } = useAuth();
  const { settings } = useLibrarySettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = (event) => {
    event.preventDefault();

    if (login(username.trim(), password)) {
      const destination = location.state?.from?.pathname || "/";
      navigate(destination, { replace: true });
      return;
    }

    toast.error("The username or password is incorrect.");
  };

  return (
    <main className="login-page">
      <div className="login-layout">
        <section className="login-intro" aria-label="Library Desk">
          <div className="login-brand">
            <span className="login-brand-icon" aria-hidden="true">
              <i className="bi bi-book-half" />
            </span>
            <span>{settings.libraryName}</span>
          </div>
          <div className="login-message">
            <p className="page-eyebrow">Library management</p>
            <h1>Everything your library needs, in one place.</h1>
            <p>
              Sign in to manage your collection, keep track of your titles, and
              get a clear view of what is available.
            </p>
            <div className="login-benefits">
              <span>
                <i className="bi bi-check-circle-fill" aria-hidden="true" />
                Simple collection management
              </span>
              <span>
                <i className="bi bi-check-circle-fill" aria-hidden="true" />
                Your library at a glance
              </span>
            </div>
          </div>
          <p className="login-caption">
            Demo access only. This sign-in is not intended to secure production
            data.
          </p>
        </section>

        <section className="login-panel" aria-labelledby="login-title">
          <div className="login-card">
            <div className="login-mobile-brand login-brand">
              <span className="login-brand-icon" aria-hidden="true">
                <i className="bi bi-book-half" />
              </span>
              <span>{settings.libraryName}</span>
            </div>

            <div className="login-heading">
              <span className="login-avatar" aria-hidden="true">
                <i className="bi bi-person" />
              </span>
              <h2 id="login-title">Welcome back</h2>
              <p>Enter your admin details to continue.</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="username" className="form-label">
                  Username
                </label>
                <div className="login-input-wrap">
                  <i className="bi bi-person login-input-icon" aria-hidden="true" />
                  <input
                    id="username"
                    name="username"
                    className="form-control login-input"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <div className="login-input-wrap">
                  <i className="bi bi-lock login-input-icon" aria-hidden="true" />
                  <input
                    id="password"
                    name="password"
                    className="form-control login-input login-password-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="login-password-toggle"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((visible) => !visible)}
                  >
                    <i
                      className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary login-submit">
                Sign in
                <i className="bi bi-arrow-right ms-2" aria-hidden="true" />
              </button>
            </form>

            <div className="login-demo-note">
              <div className="d-flex align-items-start gap-2">
                <i className="bi bi-info-circle mt-1" aria-hidden="true" />
                <div>
                  <strong>Demo credentials</strong>
                  <p className="mb-0">
                    Username: <code>admin</code>
                    <br />
                    Password: <code>admin123</code>
                  </p>
                </div>
              </div>
            </div>
            <p className="login-security-note">
              Demo-only client-side sign-in. Do not use real or sensitive data.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Login;
