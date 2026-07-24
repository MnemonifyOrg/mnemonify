export default function SettingsSection({ title, children, className = '' }) {
  return (
    <section className={`settings-panel__section-group ${className}`.trim()}>
      {title && <h3 className="settings-panel__section-heading">{title}</h3>}
      <div className="settings-panel__section">{children}</div>
    </section>
  );
}
