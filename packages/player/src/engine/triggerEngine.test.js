import { describe, expect, it } from 'vitest';
import { runTriggers } from './triggerEngine.js';

describe('interactive-video trigger effects', () => {
  it('returns timestamp and modal actions as effects', () => {
    const result = runTriggers({}, [
      {
        trigger_id: 'trg_time',
        event: 'onTimeReached',
        actions: [
          { action: 'JUMP_TO_TIMESTAMP', target: 12.5 },
          {
            action: 'OPEN_MODAL',
            payload_type: 'interactive_video_overlay',
            content: { block: { type: 'text', content: { rich_text: [] } } },
          },
        ],
      },
    ], 'onTimeReached');

    expect(result.effects).toHaveLength(2);
    expect(result.effects[0]).toMatchObject({ action: 'JUMP_TO_TIMESTAMP', target: 12.5 });
    expect(result.effects[1].action).toBe('OPEN_MODAL');
  });
});
