import { FEATURE_FLAGS } from '@mnemonify/schema/featureFlags.js';

export function VersionHistoryButton({ onClick, featureFlags = FEATURE_FLAGS }) {
  if (!featureFlags.versionHistory) return null;
  return <button type="button" className="btn" onClick={onClick}>Version History</button>;
}
