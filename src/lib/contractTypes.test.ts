import { describe, expect, it } from 'vitest';

import {
  describeContractError,
  DONATION_VAULT_ERRORS,
  NGO_REGISTRY_ERRORS,
} from './contractTypes';

describe('describeContractError', () => {
  it('maps every donation-vault code to a message', () => {
    for (const code of Object.values(DONATION_VAULT_ERRORS)) {
      const message = describeContractError(new Error(`Error(Contract, #${code})`));
      expect(message).not.toContain('Error(Contract');
    }
  });

  it('maps ngo-registry codes that are not vault codes', () => {
    expect(
      describeContractError(new Error(`Error(Contract, #${NGO_REGISTRY_ERRORS.NOT_REGISTERED})`)),
    ).toBe('This address is not registered in the NGO registry.');
  });

  it('prefers the vault message when a code exists in both enums', () => {
    expect(describeContractError(new Error('Error(Contract, #3)'))).toBe(
      "This stream doesn't exist on-chain. It may have already been cancelled.",
    );
  });

  it('handles the prefixed form and extra whitespace', () => {
    expect(describeContractError(new Error('contract error: Error(Contract,   #6)'))).toBe(
      'The amount must be greater than zero.',
    );
  });

  it('returns the raw text for an unknown code', () => {
    expect(describeContractError(new Error('Error(Contract, #999)'))).toBe(
      'Error(Contract, #999)',
    );
    expect(describeContractError(new Error('Error(Contract, #0)'))).toBe('Error(Contract, #0)');
  });

  it('accepts non-Error values', () => {
    expect(describeContractError('Error(Contract, #1)')).toBe(
      'The donation vault is currently paused. Please try again later.',
    );
    expect(describeContractError('network down')).toBe('network down');
  });

  it('falls back to a generic message for empty input', () => {
    expect(describeContractError('')).toBe('Something went wrong.');
    expect(describeContractError(new Error(''))).toBe('Something went wrong.');
  });
});
