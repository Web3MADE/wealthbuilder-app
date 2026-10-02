import { describe, expect, it } from 'vitest';
import { POST } from '@/app/api/plan/route';

async function validationError(body: unknown) {
  const response = await POST(
    new Request('http://localhost/api/plan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );

  expect(response.status).toBe(400);
  return (await response.json()) as { error: string };
}

const exampleRequest = {
  source: 'example',
  examplePreset: 'sol-heavy',
  goalText: 'I want to grow my money',
  timeHorizon: '3-5-years',
  dropBehavior: 'hold',
};

describe('plan request validation', () => {
  it('accepts the current example submission contract', async () => {
    const response = await POST(
      new Request('http://localhost/api/plan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(exampleRequest),
      }),
    );

    expect(response.status).not.toBe(400);
  });

  it('returns the goal text validation message', async () => {
    await expect(validationError({ ...exampleRequest, goalText: ' ' })).resolves.toEqual({
      error: 'Tell us a little more about what you want from crypto.',
    });
  });

  it('returns the source-specific selection messages', async () => {
    await expect(
      validationError({
        source: 'example',
        goalText: exampleRequest.goalText,
        timeHorizon: exampleRequest.timeHorizon,
        dropBehavior: exampleRequest.dropBehavior,
      }),
    ).resolves.toEqual({ error: 'Choose an example portfolio.' });

    await expect(
      validationError({
        source: 'wallet',
        goalText: exampleRequest.goalText,
        timeHorizon: exampleRequest.timeHorizon,
        dropBehavior: exampleRequest.dropBehavior,
      }),
    ).resolves.toEqual({ error: 'Enter a Solana wallet address.' });
  });

  it('returns the timeline and drop-behavior validation messages', async () => {
    await expect(validationError({ ...exampleRequest, timeHorizon: undefined })).resolves.toEqual({
      error: 'Choose when you may need this money.',
    });

    await expect(validationError({ ...exampleRequest, dropBehavior: undefined })).resolves.toEqual({
      error: "Choose how you think you'd react to a large drop.",
    });
  });
});
