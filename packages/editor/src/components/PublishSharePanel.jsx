import SettingsSection from './SettingsSection.jsx';
import ShareLinksPanel from './ShareLinksPanel.jsx';
import ScormExportPanel from './ScormExportPanel.jsx';
import { PdfSection } from './PlayerSettingsPanel.jsx';

function publishStatus(published, hasUnpublishedChanges) {
  if (!published) return { label: 'Not yet published', tone: 'draft' };
  if (hasUnpublishedChanges) return { label: 'Has unpublished changes since last publish', tone: 'changes' };
  return { label: 'Published', tone: 'published' };
}

export default function PublishSharePanel({
  courseId,
  canManageShareLinks,
  published,
  hasUnpublishedChanges,
  meta,
  onChangeMeta,
  findings = [],
  onOpenCourseHealth,
}) {
  const status = publishStatus(published, hasUnpublishedChanges);
  const errorCount = findings.filter((finding) => finding.severity === 'error').length;
  const warningCount = findings.filter((finding) => finding.severity === 'warning').length;
  const readyLabel = errorCount > 0
    ? `${errorCount} error${errorCount === 1 ? '' : 's'} — fix before sharing`
    : `0 errors — ready to share${!published ? ' after publishing' : ''}`;

  return (
    <div className="publish-share-hub">
      <section className="publish-share-hub__step" aria-labelledby="publish-share-step-one">
        <div className="publish-share-hub__step-header">
          <div className="publish-share-hub__step-title">
            <span className="publish-share-hub__step-number" aria-hidden="true">1</span>
            <div>
              <h3 id="publish-share-step-one">Publish this version</h3>
              <p className="settings-panel__hint">Publishing creates the version used by share links and SCORM exports.</p>
            </div>
          </div>
          <span className={`publish-share-hub__status publish-share-hub__status--${status.tone}`}>{status.label}</span>
        </div>
        <div id="publish-share-publish-settings">
          <PdfSection settings={meta.pdf_settings} onChange={(pdf_settings) => onChangeMeta({ ...meta, pdf_settings })} />
        </div>
      </section>

      <section className="publish-share-hub__step" aria-labelledby="publish-share-step-two">
        <div className="publish-share-hub__step-header">
          <div className="publish-share-hub__step-title">
            <span className="publish-share-hub__step-number" aria-hidden="true">2</span>
            <div>
              <h3 id="publish-share-step-two">Share or export</h3>
              <p className="settings-panel__hint">Give learners access to the latest published version or download it for an LMS.</p>
            </div>
          </div>
        </div>

        {!published && (
          <p className="publish-share-hub__dependency" role="status">
            Publish first to enable sharing and export. Use the Publish button in the top bar when the course is ready.
          </p>
        )}

        <div id="publish-share-share-links">
          <ShareLinksPanel courseId={courseId} canManage={canManageShareLinks} published={published} />
        </div>
        <div id="publish-share-scorm-export">
          <ScormExportPanel courseId={courseId} canExport={canManageShareLinks} published={published} />
        </div>

        <SettingsSection title="Ready to share">
          <p className={`publish-share-hub__health-summary ${errorCount > 0 ? 'publish-share-hub__health-summary--blocked' : 'publish-share-hub__health-summary--ready'}`}>
            {readyLabel}
          </p>
          {warningCount > 0 && <p className="settings-panel__hint">{warningCount} warning{warningCount === 1 ? '' : 's'} to review before sharing.</p>}
          <button type="button" className="btn" onClick={onOpenCourseHealth}>Review Course Health</button>
        </SettingsSection>
      </section>
    </div>
  );
}
