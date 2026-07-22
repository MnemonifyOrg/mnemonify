function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function getCourseTitle(course) {
  return course?.title || course?.meta?.title || 'Mnemonify Course';
}

export function renderLauncherConfig({ contentServerUrl, courseId, versionId, courseTitle }) {
  return `${JSON.stringify({ contentServerUrl, courseId, versionId, courseTitle }, null, 2)}\n`;
}

export function buildManifest({ courseId, versionId, courseTitle }) {
  const identifier = escapeXml(`mnemonify_${courseId}_v${versionId}`);
  const title = escapeXml(courseTitle);
  return `<?xml version="1.0" standalone="no" ?>
<manifest identifier="${identifier}" version="${escapeXml(versionId)}"
  xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"
  xmlns:adlseq="http://www.imsglobal.org/xsd/adlseq_v1p3"
  xmlns:adlnav="http://www.adlnet.org/xsd/adlnav_v1p3"
  xmlns:imsss="http://www.imsglobal.org/xsd/imsss"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 imscp_v1p1.xsd
                       http://www.imsglobal.org/xsd/imsss imsss_v1p0.xsd
                       http://www.adlnet.org/xsd/adlcp_v1p3 adlcp_v1p3.xsd
                       http://www.adlnet.org/xsd/adlnav_v1p3 adlnav_v1p3.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>2004 3rd Edition</schemaversion>
  </metadata>
  <organizations default="mnemonify_org">
    <organization identifier="mnemonify_org">
      <title>${title}</title>
      <item identifier="mnemonify_item" identifierref="mnemonify_resource">
        <title>${title}</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="mnemonify_resource" type="webcontent" adlcp:scormType="sco" href="index.html">
      <file href="index.html"/>
      <file href="scorm-api.js"/>
      <file href="config.json"/>
    </resource>
  </resources>
</manifest>
`;
}
