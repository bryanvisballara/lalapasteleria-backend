import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const logoUrl = `${import.meta.env.BASE_URL || "/"}lalalogo.jpeg`;

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
      </svg>
    );
  }

  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 3l18 18M10.5 10.7A3 3 0 0 0 12 15a3 3 0 0 0 2.3-1M6.2 6.2C4.3 7.6 2.8 9.5 2 12s3.5 7 10 7c1.6 0 3-.4 4.2-1M14 5.2c.9-.2 1.9-.2 3-.2 6.5 0 10 7 10 7a17.8 17.8 0 0 1-4.1 5.2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login({ email, password });
    } catch (submitError) {
      const apiMessage = submitError?.response?.data?.message;
      const apiDetail = submitError?.response?.data?.error || "";

      if (apiDetail.includes("buffering timed out") || apiMessage?.includes("Base de datos no disponible")) {
        setError("No se pudo conectar con la base de datos. Revisa MONGO_URI en Render y que MongoDB Atlas esté activo.");
      } else if (apiMessage === "Credenciales inválidas") {
        setError("Email o contraseña incorrectos. Si es la primera vez en producción, crea el usuario admin en MongoDB.");
      } else {
        setError(apiMessage || submitError.message || "No se pudo iniciar sesión");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-page-glow login-page-glow-one" aria-hidden="true" />
      <div className="login-page-glow login-page-glow-two" aria-hidden="true" />

      <section className="login-brand-panel">
        <div className="login-brand-content">
          <div className="login-brand-badge">Portal interno</div>
          <img src={logoUrl} alt="Lala Pastelería" className="login-brand-logo" />
          <h1>Lala Pastelería</h1>
          <p className="login-brand-tagline">
            Gestiona pedidos, inventario, clientes y operaciones desde un solo lugar.
          </p>
          <ul className="login-brand-features">
            <li>Pedidos en tiempo real</li>
            <li>Recetario y costos</li>
            <li>Contabilidad e IMPULSA</li>
          </ul>
        </div>
      </section>

      <section className="login-form-panel">
        <form className="login-card" onSubmit={handleSubmit} autoComplete="off">
          <div className="login-card-head">
            <h2>Bienvenido de nuevo</h2>
            <p>Ingresa con tu cuenta de administrador o vendedor.</p>
          </div>

          <label htmlFor="portal-login-email">Correo electrónico</label>
          <input
            id="portal-login-email"
            name="portal-login-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onFocus={(event) => event.target.removeAttribute("readOnly")}
            placeholder="tu@correo.com"
            autoComplete="off"
            readOnly
            required
          />

          <label htmlFor="portal-login-password">Contraseña</label>
          <div className="password-field">
            <input
              id="portal-login-password"
              name="portal-login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onFocus={(event) => event.target.removeAttribute("readOnly")}
              placeholder="Tu contraseña"
              autoComplete="new-password"
              readOnly
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              <EyeIcon open={!showPassword} />
            </button>
          </div>

          {error ? <p className="login-error" role="alert">{error}</p> : null}

          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? "Ingresando..." : "Entrar al portal"}
          </button>
        </form>
      </section>
    </main>
  );
}
