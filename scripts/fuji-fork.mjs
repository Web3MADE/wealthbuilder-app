import { spawn } from 'node:child_process';

const command = process.argv[2];
const upstream =
  process.env.FUJI_FORK_UPSTREAM_RPC_URL ||
  process.env.FUJI_RPC_URL ||
  'https://api.avax-test.network/ext/bc/C/rpc';
const port = process.env.FUJI_FORK_PORT || '8545';
const localUrl = `http://127.0.0.1:${port}`;
const mnemonic = 'test test test test test test test test test test test junk';

if (command === 'start') {
  const args = [
    '--fork-url',
    upstream,
    '--host',
    '127.0.0.1',
    '--port',
    port,
    '--chain-id',
    '43113',
    '--mnemonic',
    mnemonic,
    '--balance',
    '1000',
  ];
  if (process.env.FUJI_FORK_BLOCK_NUMBER)
    args.push('--fork-block-number', process.env.FUJI_FORK_BLOCK_NUMBER);
  console.log(`Starting Fuji fork at ${localUrl}`);
  const child = spawn('anvil', args, { stdio: 'inherit' });
  child.on('error', (error) => {
    console.error(`Unable to start Anvil: ${error.message}`);
    process.exitCode = 1;
  });
  child.on('exit', (code) => {
    process.exitCode = code ?? 0;
  });
  process.on('SIGINT', () => child.kill('SIGINT'));
  process.on('SIGTERM', () => child.kill('SIGTERM'));
} else if (command === 'reset') {
  const forking = { jsonRpcUrl: upstream };
  if (process.env.FUJI_FORK_BLOCK_NUMBER)
    forking.blockNumber = Number(process.env.FUJI_FORK_BLOCK_NUMBER);
  const response = await fetch(localUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'anvil_reset', params: [{ forking }] }),
  });
  const result = await response.json();
  if (!response.ok || result.error)
    throw new Error('Anvil reset failed. Is the local fork running?');
  console.log(`Fuji fork reset at ${localUrl}`);
} else {
  console.error('Usage: node scripts/fuji-fork.mjs start|reset');
  process.exitCode = 1;
}
