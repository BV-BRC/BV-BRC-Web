/* eslint-env jest */
// TurnFollow: when the chat stops following a running turn.
const path = require('path');

const TF = require(path.join(__dirname, '..', 'TurnFollow.js'));

const user = { role: 'user', content: 'How many Vibrio genomes?' };
const status = { role: 'status', message_id: 's1', steps: [{ step_id: 't1', status: 'running' }] };

describe('answerStarted', () => {
  test('only the question and the progress card: still working', () => {
    expect(TF.answerStarted([user])).toBe(false);
    expect(TF.answerStarted([user, status])).toBe(false);
    expect(TF.answerStarted([user, { role: 'assistant', content: '' }, status])).toBe(false);
  });
  test('assistant text or a card after the latest question: answer started', () => {
    expect(TF.answerStarted([user, { role: 'assistant', content: 'There are' }])).toBe(true);
    expect(TF.answerStarted([user, { role: 'assistant', content: '', card: { card_type: 'execution_blocked' } }])).toBe(true);
    expect(TF.answerStarted([user, { role: 'assistant', content: '', plan: { steps: [] } }])).toBe(true);
  });
  test('answers to earlier questions do not count', () => {
    const earlier = [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'Hello' }];
    expect(TF.answerStarted(earlier.concat([user, status]))).toBe(false);
    const clar = { role: 'user_clarification', content: 'Answered Questions' };
    expect(TF.answerStarted(earlier.concat([clar]))).toBe(false);
  });
  test('junk input', () => {
    expect(TF.answerStarted(null)).toBe(false);
    expect(TF.answerStarted([null, user])).toBe(false);
  });
});

describe('isScrollUpIntent', () => {
  test('wheel up, up keys and Shift+Space, touch and scrollbar presses', () => {
    expect(TF.isScrollUpIntent({ type: 'wheel', deltaY: -40 })).toBe(true);
    expect(TF.isScrollUpIntent({ type: 'wheel', deltaY: 40 })).toBe(false);
    ['ArrowUp', 'PageUp', 'Home'].forEach(key => expect(TF.isScrollUpIntent({ type: 'keydown', key })).toBe(true));
    expect(TF.isScrollUpIntent({ type: 'keydown', key: ' ', shiftKey: true })).toBe(true);
    expect(TF.isScrollUpIntent({ type: 'keydown', key: ' ' })).toBe(false);
    expect(TF.isScrollUpIntent({ type: 'keydown', key: 'ArrowDown' })).toBe(false);
    ['touchstart', 'touchmove', 'mousedown'].forEach(type => expect(TF.isScrollUpIntent({ type })).toBe(true));
  });
  test('anything else is not', () => {
    expect(TF.isScrollUpIntent({ type: 'scroll' })).toBe(false);
    expect(TF.isScrollUpIntent(null)).toBe(false);
  });
});
