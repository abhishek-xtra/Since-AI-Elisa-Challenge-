import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';
import { createMockSource } from './data/mockSource';
import type { DataSource } from './data/types';

afterEach(cleanup);

describe('question card', () => {
  it('collapses to "Answered: <label>" after answer()', async () => {
    const base = createMockSource();
    let answered = false;
    const source: DataSource = {
      ...base,
      // thread-001 as it was before Erkki tapped the edge question
      getThread: async (id) => {
        const t = await base.getThread(id);
        if (id === 'thread-001' && !answered) t.questions[1].answered = false;
        return t;
      },
      answer: vi.fn(async () => { answered = true; }),
    };
    render(<App source={source} beat={null} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Experts' }));
    const cards = await screen.findAllByRole('group', { name: 'Question to Erkki Expert' });
    const pending = cards.find((g) => within(g).queryByRole('button', { name: 'No' }))!;
    expect(within(cards[0]).getByText('Answered: All older units')).toBeTruthy();
    fireEvent.click(within(pending).getByRole('button', { name: 'No' }));
    expect(await within(pending).findByText('Answered: No')).toBeTruthy();
    expect(within(pending).queryAllByRole('button')).toHaveLength(0);
    expect(source.answer).toHaveBeenCalledWith('CA-0001', 1);
  });
});

describe('replay', () => {
  it('?beat=3 shows the TRN-087 proposal verbatim and an unread notice badge', async () => {
    const source = createMockSource();
    const beat3 = await source.getBeat(3);
    render(<App source={source} beat={3} />);
    expect(await screen.findByText(beat3.data.agent_text!)).toBeTruthy();
    expect(screen.getByLabelText('1 unread')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Report fault' })).toBeNull();
  });

  it('?beat=7 counts both of Erkki\'s notices on the Activity badge until he opens Experts', async () => {
    render(<App source={createMockSource()} beat={7} />);
    expect(await screen.findByLabelText('2 unread')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Experts/ }));
    expect(screen.queryByLabelText('2 unread')).toBeNull();
  });
});

describe('reveal mode off', () => {
  it('?beat=7 renders the same post list as before reveal mode existed', async () => {
    const source = createMockSource();
    const beat7 = await source.getBeat(7);
    const { container } = render(<App source={source} beat={7} />);
    await screen.findAllByText(beat7.data.agent_text!);
    expect(container.querySelector('.posts')!.outerHTML).toMatchSnapshot();
  });
});
