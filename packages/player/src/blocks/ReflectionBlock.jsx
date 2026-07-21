import { useState } from 'react';

// Hard privacy rule, not an oversight (REQUIREMENTS.md P1-46 / ARCHITECTURE.md
// 3.8): reflection text lives in this component's React state only, for the
// duration of the session. It must never be sent to the backend, never
// written to SCORM suspend_data, and never included in any analytics/
// telemetry event payload. Do not wire this textarea's value into any API
// call, App.jsx's suspend_data serialization, or an onTrigger/telemetry
// event -- that would defeat the entire point of this block existing.
export default function ReflectionBlock({ block, printMode }) {
  const { prompt } = block.content;
  const [response, setResponse] = useState('');

  return (
    <div className="block block-reflection">
      <p className="block-reflection__prompt">
        {(prompt?.rich_text || []).map((segment, i) => (
          <span key={i}>{segment.v}</span>
        ))}
      </p>
      {!printMode && <textarea
        className="block-reflection__textarea"
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        placeholder="Type your reflection here. This is private and not saved or submitted anywhere."
        rows={4}
      />}
      {printMode && <div className="block-reflection__ruled-space" aria-label="Reflection response space" />}
    </div>
  );
}
