import test from 'node:test';
import assert from 'node:assert/strict';
import { segmentsToVtt } from './captionPipeline.js';
import { srtToVtt } from '../routes/captions.js';

test('converts Whisper segments to WebVTT', () => {
  assert.equal(
    segmentsToVtt([{ start: 0, end: 1.25, text: 'Hello world' }]),
    'WEBVTT\n\n1\n00:00:00.000 --> 00:00:01.250\nHello world\n'
  );
});

test('converts SRT timestamps to WebVTT timestamps', () => {
  const vtt = srtToVtt('1\n00:00:01,500 --> 00:00:03,000\nHello\n');
  assert.match(vtt, /^WEBVTT/);
  assert.match(vtt, /00:00:01\.500 --> 00:00:03\.000/);
  assert.match(vtt, /Hello/);
});
