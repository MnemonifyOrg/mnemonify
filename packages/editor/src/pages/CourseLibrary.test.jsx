import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CourseCard } from './CourseLibrary.jsx';
import { getCourseAccent, getCourseCoverImage, getCourseInitial } from '../lib/courseCard.js';

globalThis.React = React;

const baseCourse = {
  id: 'course_one',
  title: 'A very long course title that should clamp in the card',
  status: 'draft',
  updated_at: '2026-07-23T00:00:00.000Z',
  course_json: { meta: { theme: { accent: '#7C3AED' } } },
};

const cardProps = {
  onOpen: () => {},
  onDuplicate: () => {},
  onDelete: () => {},
};

describe('dashboard course cards', () => {
  it('renders an accent-gradient initial fallback when no cover image exists', () => {
    const html = renderToStaticMarkup(<CourseCard course={baseCourse} {...cardProps} />);

    expect(html).toContain('course-card__cover--fallback');
    expect(html).toContain('--course-accent:#7C3AED');
    expect(html).toContain('course-card__cover-initial');
    expect(html).toContain('>A</span>');
    expect(html).toContain('Draft');
    expect(html).toContain('aria-label="Actions for A very long course title that should clamp in the card"');
  });

  it('renders an existing cover image and published status', () => {
    const course = { ...baseCourse, status: 'published', cover_image_url: '/uploads/course-cover.jpg' };
    const html = renderToStaticMarkup(<CourseCard course={course} {...cardProps} />);

    expect(html).toContain('course-card__cover-image');
    expect(html).toContain('src="/uploads/course-cover.jpg"');
    expect(html).not.toContain('course-card__cover--fallback');
    expect(html).toContain('Published');
  });

  it('keeps cover and accent helpers tolerant of optional dashboard fields', () => {
    expect(getCourseCoverImage({ cover: { url: '/cover.png' } })).toBe('/cover.png');
    expect(getCourseAccent({ accent: '#123456' })).toBe('#123456');
    expect(getCourseAccent({ accent: 'not-a-color' })).toBe('#0E7A8A');
    expect(getCourseInitial('  mnemonify')).toBe('M');
    expect(getCourseInitial('')).toBe('?');
  });
});
