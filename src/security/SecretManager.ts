import * as dotenv from 'dotenv';
import { SecretStore } from '../types';

/**
 * SecretManager securely fetches credentials from environment variables or OS Keychain.
 * Implements the SecretStore interface.
 */
export class SecretManager implements SecretStore {
  constructor() {
    // Load environment variables from .env file if it exists.
    // dotenv.config() handles missing .env files gracefully by returning an error object instead of throwing.
    const result = dotenv.config();
    if (result.error) {
      // Use console.error for startup messages so they don't break the MCP stdio protocol
      console.error('SecretManager: .env file not found or could not be loaded, proceeding with process.env.');
    }
  }

  /**
   * Fetches a secret by key.
   * Priority: process.env > OS Keychain (Placeholder)
   * 
   * @param key The key of the secret to fetch
   * @returns The secret value or undefined if not found
   */
  async getSecret(key: string): Promise<string | undefined> {
    // 1. Check process.env first as it is the most common way to provide secrets in CI/CD and local dev.
    const envSecret = process.env[key];
    if (envSecret) {
      return envSecret;
    }

    // 2. Placeholder for OS Keychain lookup.
    // In a production environment, you might use a library like 'keytar' to securely 
    // retrieve secrets from the system's keychain (macOS Keychain, Windows Credential Vault, etc.)
    // Example:
    // return await this.getFromKeychain(key);
    
    return this.getFromKeychainPlaceholder(key);
  }

  /**
   * Placeholder for OS Keychain integration.
   * To implement this, you would typically add 'keytar' to your dependencies.
   * 
   * @param key The key to look up in the keychain
   */
  private async getFromKeychainPlaceholder(key: string): Promise<string | undefined> {
    // Implementation would look something like:
    // import * as keytar from 'keytar';
    // return await keytar.getPassword('Testing-MCP', key);
    
    // Currently returns undefined as a placeholder.
    return undefined;
  }

  /**
   * Returns a masked version of the secret for safe logging.
   * 
   * @param value The secret value to mask
   * @returns A masked string (e.g., "****")
   */
  maskSecret(value: string): string {
    if (!value) return '';
    
    // Mask most of the string, leaving only the last 4 characters if the string is long enough.
    if (value.length <= 8) {
      return '****';
    }
    
    return '*'.repeat(value.length - 4) + value.slice(-4);
  }
}
