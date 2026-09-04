import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import TriggerBuilderModal from './TriggerBuilderModal.jsx';

globalThis.React = React;

function renderOverlay(requireAnswer) {
  return renderToStaticMarkup(
    <TriggerBuilderModal
      title="Add video pause point"
      validEvents={['onTimeReached']}
      blockType="video"
      pageBlocks={[]}
      pages={[]}
      variables={[]}
      existingTrigger={{
        trigger_id: 'trg_overlay',
        event: 'onTimeReached',
        actions: [{
          action: 'OPEN_MODAL',
          payload_type: 'interactive_video_overlay',
          content: {
            block: {
              block_id: 'blk_overlay',
              type: 'knowledge-check',
              require_answer: requireAnswer,
              content: {
                question: 'Question',
                options: [{ id: 'opt_1', text: 'Answer', correct: true }],
              },
            },
          },
        }],
      }}
      onSave={() => {}}
      onClose={() => {}}
    />
  );
}

describe('interactive video overlay settings', () => {
  it('labels the optional answer gate and leaves it off by default', () => {
    const html = renderOverlay(false);
    expect(html).toContain('Require an answer before continuing');
    expect((html.match(/checked=""/g) || []).length).toBe(1); // correct answer option only
  });

  it('reflects an enabled answer gate in the editor', () => {
    const html = renderOverlay(true);
    expect(html).toContain('Require an answer before continuing');
    expect(html).toContain('checked=""');
  });
});
