export function getCourseCoverImage(course) {
  return course.cover_image_url
    || course.cover_url
    || course.coverImageUrl
    || course.cover_image?.url
    || course.cover?.url
    || course.course_json?.meta?.cover_image_url
    || '';
}

export function getCourseAccent(course) {
  const accent = course.course_json?.meta?.theme?.accent || course.theme?.accent || course.accent || '#0E7A8A';
  return /^#[0-9a-f]{3,8}$/i.test(accent) ? accent : '#0E7A8A';
}

export function getCourseInitial(title) {
  return title?.trim()?.charAt(0)?.toUpperCase() || '?';
}
