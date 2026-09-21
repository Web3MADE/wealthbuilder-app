const rpcUrl = process.env.FUJI_FORK_RPC_URL || 'http://127.0.0.1:8545';
const upstreamRpcUrl =
  process.env.FUJI_FORK_UPSTREAM_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc';
const usdc = '0x5425890298aed601595a70AB815c96711a31Bc65';
const recipient = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const requested = BigInt(process.env.FUJI_FORK_USDC_AMOUNT || '100') * 1_000_000n;
let id = 0;

async function rpc(method, params = []) {
  return rpcAt(rpcUrl, method, params);
}

async function rpcAt(url, method, params = []) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }),
  });
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error(payload.error?.message || `${method} failed`);
  return payload.result;
}

function topicAddress(topic) {
  return `0x${topic.slice(-40)}`;
}
function balanceData(address) {
  return `0x70a08231${address.slice(2).padStart(64, '0')}`;
}
function transferData(address, amount) {
  return `0xa9059cbb${address.slice(2).padStart(64, '0')}${amount.toString(16).padStart(64, '0')}`;
}

async function recentTransferLogs(url) {
  const block = BigInt(await rpcAt(url, 'eth_blockNumber'));
  return rpcAt(url, 'eth_getLogs', [
    {
      address: usdc,
      fromBlock: `0x${(block > 10_000n ? block - 10_000n : 0n).toString(16)}`,
      toBlock: 'latest',
      topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'],
    },
  ]);
}

let logs = await recentTransferLogs(rpcUrl);
if (logs.length === 0) logs = await recentTransferLogs(upstreamRpcUrl);
const candidates = [...new Set(logs.flatMap((log) => log.topics.slice(1, 3).map(topicAddress)))];
let source;
for (const candidate of candidates) {
  const balance = BigInt(
    await rpc('eth_call', [{ to: usdc, data: balanceData(candidate) }, 'latest']),
  );
  if (balance >= requested) {
    source = candidate;
    break;
  }
}
if (!source) throw new Error('Could not find a Fuji USDC holder in recent fork transfer logs.');

await rpc('anvil_impersonateAccount', [source]);
await rpc('anvil_setBalance', [source, '0x3635C9ADC5DEA00000']);
const hash = await rpc('eth_sendTransaction', [
  { from: source, to: usdc, data: transferData(recipient, requested) },
]);
for (let attempt = 0; attempt < 30; attempt += 1) {
  const receipt = await rpc('eth_getTransactionReceipt', [hash]);
  if (receipt) {
    if (receipt.status !== '0x1') throw new Error('Local Fuji USDC funding transaction reverted.');
    console.log(`Funded ${requested / 1_000_000n} USDC for ${recipient}: ${hash}`);
    process.exit(0);
  }
  await new Promise((resolve) => setTimeout(resolve, 200));
}
throw new Error('Timed out waiting for local Fuji USDC funding transaction.');
