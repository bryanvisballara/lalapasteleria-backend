import { useState } from "react";

export default function LogoutFab({ onConfirm }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="logout-fab"
        aria-label="Cerrar sesión"
        onClick={() => setOpen(true)}
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M14 4H7C6.44772 4 6 4.44772 6 5V19C6 19.5523 6.44772 20 7 20H14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10 12H21"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M18 9L21 12L18 15"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open ? (
        <div className="logout-modal-overlay" role="dialog" aria-modal="true">
          <div className="logout-modal-card">
            <p>¿Deseas cerrar sesión?</p>
            <div className="logout-modal-actions">
              <button type="button" onClick={() => setOpen(false)}>Cancelar</button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onConfirm?.();
                }}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
