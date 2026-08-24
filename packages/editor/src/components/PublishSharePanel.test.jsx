import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import PublishSharePanel from './PublishSharePanel.jsx';

globalThis.React = React;

const baseProps = {
  courseId: 'course-test',
  canManageShareLinks: true,
  meta: {},
  pages: [],
  onChangeMeta: () => {},
  onOpenCourseHealth: () => {},
};

describe('PublishSharePanel', () => {
  it('makes the publish-first dependency clear for an unpublished course', () => {
    const html = renderToStaticMarkup(<PublishSharePanel {...baseProps} published={false} hasUnpublishedChanges={false} />);

    expect(html).toContain('1</span>');
    expect(html).toContain('Publish this version');
    expect(html).toContain('Not yet published');
    expect(html).toContain('2</span>');
    expect(html).toContain('Share or export');
    expect(html).toContain('Publish first to enable sharing and export');
    expect(html).toContain('PDF publishing');
  });

  it('shows published and changed states plus a course health readiness summary', () => {
    const changed = renderToStaticMarkup(
      <PublishSharePanel {...baseProps} published hasUnpublishedChanges findings={[{ severity: 'error' }, { severity: 'error' }]} />,
    );
    const ready = renderToStaticMarkup(<PublishSharePanel {...baseProps} published hasUnpublishedChanges={false} />);

    expect(changed).toContain('Has unpublished changes since last publish');
    expect(changed).toContain('2 errors — fix before sharing');
    expect(changed).toContain('Review Course Health');
    expect(ready).toContain('Published');
    expect(ready).toContain('0 errors — ready to share');
  });
});
