import { describe, expect, it } from 'vitest';
import { POST } from '@/app/api/plan/route';

const intakeRequest = {
  goal: 'I wanna get rich',
  portfolio: 'SOL 40%, BTC 30%, USDC 30%',
  timeHorizon: '3-5-years',
  liquidityPreference: 'some',
  riskPreference: 'balanced',
  cryptoExperience: 'comfortable',
  email: 'person@example.com',
};

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

describe('intake request validation', () => {
  it('accepts a complete intake request through validation', async () => {
    const response = await POST(
      new Request('http://localhost/api/plan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(intakeRequest),
      }),
    );

    expect(response.status).not.toBe(400);
  });

  it('accepts simple goals and rejects missing required context', async () => {
    await expect(validationError({ ...intakeRequest, goal: ' ' })).resolves.toEqual({
      error: 'Tell us a little about what you want from crypto.',
    });
    await expect(validationError({ ...intakeRequest, portfolio: ' ' })).resolves.toEqual({
      error: 'Tell us roughly what your portfolio looks like.',
    });
  });

  it('requires preferences and a valid email', async () => {
    await expect(validationError({ ...intakeRequest, timeHorizon: undefined })).resolves.toEqual({
      error: 'Choose when you might need this money.',
    });
    await expect(validationError({ ...intakeRequest, email: 'not-an-email' })).resolves.toEqual({
      error: 'Enter a valid email address.',
    });
  });
});
