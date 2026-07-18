// Reads course.meta.utility_bar (ARCHITECTURE.md 5.1). Rendered TWICE by
// App.jsx with a different `layout` -- once inside TopBar as inline text
// links (hidden below 1280px via CSS), once as a fixed-to-viewport bottom
// bar (hidden at 1280px+ via CSS). Both instances share the exact same
// item list and click handlers; only the wrapping markup/CSS differs,
// which is why this is one component with a layout prop rather than two
// separate ones -- there is no behavioral difference to duplicate.
export default function UtilityBar({ utilityBar, courseTitle, onOpenModal, onJumpToPage, layout }) {
  const contact = utilityBar?.contact;
  const resources = utilityBar?.resources;
  const custom = utilityBar?.custom || [];

  const items = [];

  if (contact?.enabled) {
    items.push({
      id: 'contact',
      label: 'Contact',
      onClick: () =>
        onOpenModal({
          type: 'email',
          recipient: contact.email,
          subjectPrefix: contact.subject_prefix,
          courseName: courseTitle,
          ariaLabel: 'Contact',
        }),
    });
  }

  if (resources?.enabled) {
    items.push({
      id: 'resources',
      label: 'Resources',
      // The PDF pipeline is Phase 5 scope (P1-18) -- this placeholder
      // keeps the utility item real and clickable now so it doesn't need
      // to change shape once real course PDFs exist to list here.
      onClick: () =>
        onOpenModal({
          type: 'message',
          message: 'Course resources will appear here once published.',
          ariaLabel: 'Resources',
        }),
    });
  }

  custom.forEach((item) => {
    items.push({
      id: item.id,
      label: item.label,
      onClick: () => {
        if (item.action === 'jump_page') {
          onJumpToPage(item.target);
        } else {
          onOpenModal({ type: 'message', message: item.target, ariaLabel: item.label });
        }
      },
    });
  });

  if (items.length === 0) return null;

  const className = layout === 'bottom' ? 'utility-bar utility-bar--bottom' : 'utility-bar utility-bar--inline';

  return (
    <nav className={className} aria-label="Course utilities">
      {items.map((item) => (
        <button key={item.id} type="button" className="utility-bar__item" onClick={item.onClick}>
          {item.label}
        </button>
      ))}
    </nav>
  );
}
