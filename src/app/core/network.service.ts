import { Injectable, computed, signal } from '@angular/core';
import { JsonRpcProvider } from 'ethers';

const RPC_KEY = 'besu.rpcUrl';

export type ConnectionStatus = 'idle' | 'checking' | 'ok' | 'error';

@Injectable({ providedIn: 'root' })
export class NetworkService {
  readonly rpcUrl = signal<string>(localStorage.getItem(RPC_KEY) ?? '');
  readonly status = signal<ConnectionStatus>('idle');
  readonly chainId = signal<bigint | null>(null);
  readonly blockNumber = signal<number | null>(null);
  readonly error = signal<string | null>(null);

  readonly configured = computed(() => this.rpcUrl().length > 0);

  private _provider: JsonRpcProvider | null = null;

  constructor() {
    if (this.configured()) {
      void this.check();
    }
  }

  get provider(): JsonRpcProvider {
    if (!this.configured()) {
      throw new Error('Endereço do nó não configurado');
    }
    if (!this._provider) {
      this._provider = new JsonRpcProvider(this.rpcUrl());
    }
    return this._provider;
  }

  async setRpcUrl(url: string): Promise<void> {
    const trimmed = url.trim().replace(/\/+$/, '');
    localStorage.setItem(RPC_KEY, trimmed);
    this.rpcUrl.set(trimmed);
    this._provider?.destroy();
    this._provider = null;
    this.chainId.set(null);
    this.blockNumber.set(null);
    if (trimmed) {
      await this.check();
    } else {
      this.status.set('idle');
    }
  }

  async check(): Promise<boolean> {
    if (!this.configured()) {
      this.status.set('idle');
      return false;
    }
    this.status.set('checking');
    this.error.set(null);
    try {
      const network = await this.provider.getNetwork();
      const block = await this.provider.getBlockNumber();
      this.chainId.set(network.chainId);
      this.blockNumber.set(block);
      this.status.set('ok');
      return true;
    } catch (e) {
      this.status.set('error');
      this.error.set(e instanceof Error ? e.message : 'Falha ao conectar ao nó');
      return false;
    }
  }
}
