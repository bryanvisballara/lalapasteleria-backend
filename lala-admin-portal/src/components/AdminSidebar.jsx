export default function AdminSidebar({ sections, activeTab, onSelect, userName }) {
  const logoUrl = `${import.meta.env.BASE_URL || "/"}lalalogo.jpeg`;

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-brand">
        <img src={logoUrl} alt="Lala Pastelería" className="admin-sidebar-logo" />
        <p className="admin-sidebar-title">Lala Pastelería</p>
        <p className="admin-sidebar-user">Hola, {userName || "Admin"}</p>
      </div>

      <nav className="admin-sidebar-nav" aria-label="Secciones del portal">
        {sections.map((section) => (
          <div key={section.title} className="sidebar-section">
            <p className="sidebar-section-title">{section.title}</p>
            <div className="sidebar-section-items">
              {section.tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`sidebar-nav-button ${activeTab === tab.key ? "active" : ""}`}
                  onClick={() => onSelect(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
