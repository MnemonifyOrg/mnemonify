// Fallback preview for any block type without a dedicated editor yet.
export default function GenericBlockPreview({ block }) {
  return <pre className="generic-block-preview">{JSON.stringify(block.content, null, 2)}</pre>;
}
