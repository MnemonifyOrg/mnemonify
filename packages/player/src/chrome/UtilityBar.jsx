// Reads course.meta.utility_bar (ARCHITECTURE.md 5.1). Rendered THREE times
// (Phase 4 usability-fix session added the third) with a different `layout`
// -- once inside TopBar as inline text links (hidden below 1280px via CSS),
// once as a fixed-to-viewport bottom bar (hidden at 1280px+ via CSS), and
// once inside NavDrawer as a vertical list at the bottom of the mobile
// hamburger menu (P1-57 -- always visible regardless of width, since the
// drawer itself is what's gated by breakpoint). All three instances share
// the exact same item list and click handlers; only the wrapping markup/CSS
// differs, which is why this is one component with a layout prop rather
// than three separate ones -- there is no behavioral difference to
// duplicate. `className` is derived directly from `layout` (utility-bar--
// <layout>) rather than a bottom-or-inline ternary, specifically so a third
// layout value doesn't silently fall through to the wrong CSS class the way
// "drawer" did before this comment was written -- see DECISIONS.md.
export default function UtilityBar({ utilityBar, resources, courseTitle, onOpenModal, onJumpToPage, layout }) {
  const contact = utilityBar?.contact;
  const resourcesConfig = utilityBar?.resources;
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

  if (resourcesConfig?.enabled) {
    items.push({
      id: 'resources',
      label: 'Resources',
      // Manually-attached resources (Step 2, Phase 4 usability-fix
      // session) -- distinct from the still-unbuilt Phase 5 auto-generated
      // PDF pipeline (P1-18/19). The two are expected to coexist in this
      // same modal once Phase 5 lands (an auto-generated summary PDF
      // alongside whatever's manually attached here) -- see DECISIONS.md.
      onClick: () =>
        onOpenModal({
          type: 'resources',
          resources: resources || [],
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

  const className = `utility-bar utility-bar--${layout || 'inline'}`;

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
