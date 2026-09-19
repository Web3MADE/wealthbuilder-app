export type Money = Readonly<{ currency: 'USD'; micros: bigint }>;
export type AtomicAmount = Readonly<{ value: bigint; decimals: number }>;

export const usd = (micros: bigint): Money => {
  if (micros < 0n) throw new Error('USD money cannot be negative.');
  return { currency: 'USD', micros };
};

export const atomic = (value: bigint, decimals: number): AtomicAmount => {
  if (value < 0n || !Number.isInteger(decimals) || decimals < 0 || decimals > 36)
    throw new Error('Invalid atomic amount.');
  return { value, decimals };
};

export const multiplyPrice = (amount: AtomicAmount, priceMicrosPerUnit: bigint): Money =>
  usd((amount.value * priceMicrosPerUnit) / 10n ** BigInt(amount.decimals));
