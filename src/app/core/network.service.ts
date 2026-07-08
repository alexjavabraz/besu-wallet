import { Injectable } from '@angular/core';
import { JsonRpcProvider } from 'ethers';

const RPC_KEY = 'besu.rpcUrl';

export type ConnectionStatus = 'idle' | 'checking' | 'ok' | 'error';

@Injectable({ providedIn: 'root' })
export class NetworkService {
  rpcUrl: string = localStorage.getItem(RPC_KEY) ?? '';
  status: ConnectionStatus = 'idle';
  chainId: bigint | null = null;
  blockNumber: number | null = null;
  error: string | null = null;

  get configured(): boolean { return this.rpcUrl.length > 0; }

  private _provider: JsonRpcProvider | null = null;

  constructor() {
    if (this.configured) {
      void this.check();
    }
  }

  get provider(): JsonRpcProvider {
    if (!this.configured) throw new Error('Endereço do nó não configurado');
    if (!this._provider) {
      this._provider = new JsonRpcProvider(this.rpcUrl);
    }
    return this._provider;
  }

  async setRpcUrl(url: string): Promise<void> {
    const trimmed = url.trim().replace(/\/+$/, '');
    localStorage.setItem(RPC_KEY, trimmed);
    this.rpcUrl = trimmed;
    this._provider?.destroy();
    this._provider = null;
    this.chainId = null;
    this.blockNumber = null;
    if (trimmed) {
      await this.check();
    } else {
      this.status = 'idle';
    }
  }

  async check(): Promise<boolean> {
    if (!this.configured) {
      this.status = 'idle';
      return false;
    }
    this.status = 'checking';
    this.error = null;
    try {
      const network = await this.provider.getNetwork();
      const block = await this.provider.getBlockNumber();
      this.chainId = network.chainId;
      this.blockNumber = block;
      this.status = 'ok';
      return true;
    } catch (e) {
      this.status = 'error';
      this.error = e instanceof Error ? e.message : 'Falha ao conectar ao nó';
      return false;
    }
  }
}
