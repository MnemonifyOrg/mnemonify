export default function ReflectionBlockEditor({ block, onChange }) {
  const promptText = block.content.prompt?.rich_text?.[0]?.v || '';

  function handlePromptBlur(e) {
    const text = e.currentTarget.textContent;
    if (text === promptText) return;
    onChange({ ...block, content: { ...block.content, prompt: { rich_text: [{ t: 'text', v: text }] } } });
  }

  return (
    <div className="reflection-block-editor">
      <div
        className="editable-field reflection-block-editor__prompt"
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Click to add the reflection prompt..."
        onBlur={handlePromptBlur}
      >
        {promptText}
      </div>
      {/* Only needs to be a real, working textarea in the player -- see
          ARCHITECTURE.md 3.8 / REQUIREMENTS.md P1-46. This is a static
          placeholder so the editor preview doesn't imply learner responses
          are captured or reviewable here. */}
      <div className="reflection-block-editor__placeholder">[Learner response appears here]</div>
    </div>
  );
}
