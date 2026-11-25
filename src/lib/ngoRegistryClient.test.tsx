import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ADDRESS = 'G' + 'D'.repeat(55);

const { showToast, clientFrom, signTransaction, stellar } = vi.hoisted(() => ({
  showToast: vi.fn(),
  clientFrom: vi.fn(),
  signTransaction: vi.fn(),
  stellar: { contractId: 'CREGISTRYFAKE' },
}));

vi.mock('@stellar/stellar-sdk/contract', () => ({
  Client: { from: (...args: unknown[]) => clientFrom(...args) },
}));

vi.mock('@/components/toast/ToastProvider', () => ({
  useToast: () => ({ showToast }),
}));

vi.mock('@/components/wallet/WalletProvider', () => ({
  useWallet: () => ({ address: ADDRESS, signTransaction }),
}));

vi.mock('./stellar', () => ({
  get NGO_REGISTRY_CONTRACT_ID() {
    return stellar.contractId;
  },
  NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
  SOROBAN_RPC_URL: 'https://example.invalid',
}));

import { getNgoRegistryClient, useNgoRegistryClient } from './ngoRegistryClient';

describe('getNgoRegistryClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stellar.contractId = 'CREGISTRYFAKE';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds the client with the contract, network, public key and signing step', async () => {
    const fakeClient = { fake: true };
    clientFrom.mockResolvedValue(fakeClient);

    const client = await getNgoRegistryClient(ADDRESS, signTransaction);

    expect(client).toBe(fakeClient);
    expect(clientFrom).toHaveBeenCalledWith({
      contractId: 'CREGISTRYFAKE',
      networkPassphrase: 'Test SDF Network ; September 2015',
      rpcUrl: 'https://example.invalid',
      publicKey: ADDRESS,
      signTransaction,
    });
  });

  it('rejects with a clear error when the contract id is not configured', async () => {
    stellar.contractId = '';

    await expect(getNgoRegistryClient(ADDRESS, signTransaction)).rejects.toThrow(
      'NEXT_PUBLIC_NGO_REGISTRY_CONTRACT_ID is not set',
    );
    expect(clientFrom).not.toHaveBeenCalled();
  });

  it('maps a stalled spec fetch to a TimeoutError', async () => {
    const controller = new AbortController();
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);
    clientFrom.mockReturnValue(new Promise(() => {}));

    const pending = getNgoRegistryClient(ADDRESS, signTransaction).catch((err) => err);
    controller.abort();
    const error = await pending;

    expect(error.name).toBe('TimeoutError');
    expect(error.message).toContain('Timed out reaching the NGO registry contract');
  });
});

describe('useNgoRegistryClient', () => {
  let latest: ReturnType<typeof useNgoRegistryClient> | null = null;

  function Probe() {
    latest = useNgoRegistryClient();
    return null;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    latest = null;
    stellar.contractId = 'CREGISTRYFAKE';
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('exposes the client once it is ready', async () => {
    const fakeClient = { fake: true };
    clientFrom.mockResolvedValue(fakeClient);

    render(<Probe />);

    await vi.waitFor(() => expect(latest?.ready).toBe(true));
    expect(latest?.client).toBe(fakeClient);
    expect(latest?.initError).toBeNull();
  });

  it('shows a friendly message and logs the real error when initialisation fails', async () => {
    const devError = new Error('RPC unreachable');
    clientFrom.mockRejectedValue(devError);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<Probe />);

    const message = "Couldn't reach the NGO registry contract. Please try again shortly.";
    await vi.waitFor(() => expect(showToast).toHaveBeenCalledWith('error', message));
    expect(latest?.initError).toBe(message);
    expect(latest?.ready).toBe(false);
    expect(consoleError).toHaveBeenCalledWith(expect.any(String), devError);
  });
});
