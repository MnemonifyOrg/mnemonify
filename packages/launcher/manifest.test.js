import { describe, expect, it } from 'vitest';
import { buildManifest, getCourseTitle, renderLauncherConfig } from './manifest.js';

describe('SCORM launcher course title metadata', () => {
  it('resolves the authored course title from the content document', () => {
    expect(getCourseTitle({ meta: { title: 'Frozen Section Basics' } })).toBe('Frozen Section Basics');
    expect(getCourseTitle({ title: 'Database title', meta: { title: 'JSON title' } })).toBe('Database title');
  });

  it('writes the authored title to both manifest organization titles', () => {
    const manifest = buildManifest({ courseId: 'crs_1', versionId: '7', courseTitle: 'A & B <Intro>' });

    expect(manifest).toContain('<title>A &amp; B &lt;Intro&gt;</title>');
    expect(manifest).not.toContain('Mnemonify Course');
  });

  it('includes the title in the launcher config for the outer browser tab', () => {
    expect(JSON.parse(renderLauncherConfig({ contentServerUrl: 'https://content.example', courseId: 'crs_1', versionId: '7', courseTitle: 'Course "7"' }))).toEqual({
      contentServerUrl: 'https://content.example',
      courseId: 'crs_1',
      versionId: '7',
      courseTitle: 'Course "7"',
    });
  });
});
