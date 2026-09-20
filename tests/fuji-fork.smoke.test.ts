import { describe, expect, it } from 'vitest';
import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { avalancheFuji } from 'viem/chains';
import { aaveV3Fuji } from '@/config';
import { AvalancheFujiAdapter, parseFujiTokens } from '@/infrastructure/chains/avalanche-fuji-adapter';
import { ConfiguredFujiPrices } from '@/infrastructure/pricing/configured-fuji-prices';

const run = process.env.RUN_FUJI_FORK_SMOKE === '1' ? describe : describe.skip;

run('local Fuji fork', () => {
  it('connects, reads a funded account, submits and confirms a transaction, and retains Aave code', async () => {
    const url = process.env.FUJI_FORK_RPC_URL || 'http://127.0.0.1:8545';
    expect(new URL(url).hostname).toMatch(/^(127\.0\.0\.1|localhost)$/);
    const publicClient = createPublicClient({ chain: avalancheFuji, transport: http(url) });
    const account = mnemonicToAccount('test test test test test test test test test test test junk');
    const walletClient = createWalletClient({ chain: avalancheFuji, transport: http(url), account });

    expect(await publicClient.getChainId()).toBe(43113);
    const before = await publicClient.getBalance({ address: account.address });
    expect(before).toBeGreaterThan(parseEther('1'));
    const portfolio = await new AvalancheFujiAdapter(
      url, parseFujiTokens(undefined, aaveV3Fuji.assets.usdc!), new ConfiguredFujiPrices(),
    ).getPortfolio(account.address, { id: 'avalanche-fuji' });
    expect(portfolio.positions.map((position) => position.asset.id)).toEqual(['avax', 'usdc']);
    expect(await publicClient.getBytecode({ address: aaveV3Fuji.poolAddress })).toMatch(/^0x[0-9a-f]+$/i);
    expect(await publicClient.getBytecode({ address: aaveV3Fuji.assets.usdc! })).toMatch(/^0x[0-9a-f]+$/i);

    const hash = await walletClient.sendTransaction({
      to: '0x000000000000000000000000000000000000dEaD', value: 1n,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 15_000 });
    expect(receipt.status).toBe('success');
    expect(await publicClient.getBalance({ address: account.address })).toBeLessThan(before);
  }, 30_000);
});
