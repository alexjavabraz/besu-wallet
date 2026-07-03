import { Injectable, computed, signal } from '@angular/core';
import { Wallet } from 'ethers';

const PK_KEY = 'besu.wallet.pk';

@Injectable({ providedIn: 'root' })
export class WalletService {
  private readonly _wallet = signal<Wallet | null>(this.restore());

  readonly wallet = this._wallet.asReadonly();
  readonly address = computed(() => this._wallet()?.address ?? null);
  readonly hasWallet = computed(() => this._wallet() !== null);

  private restore(): Wallet | null {
    const pk = sessionStorage.getItem(PK_KEY);
    if (!pk) {
      return null;
    }
    try {
      return new Wallet(pk);
    } catch {
      sessionStorage.removeItem(PK_KEY);
      return null;
    }
  }

  generate(): Wallet {
    const random = Wallet.createRandom();
    return this.load(random.privateKey);
  }

  importKey(input: string): Wallet {
    return this.load(this.extractPrivateKey(input));
  }

  private load(privateKey: string): Wallet {
    const wallet = new Wallet(privateKey);
    sessionStorage.setItem(PK_KEY, wallet.privateKey);
    this._wallet.set(wallet);
    return wallet;
  }

  /** Aceita a chave pura (com ou sem 0x) ou o conteúdo do arquivo JSON baixado. */
  private extractPrivateKey(input: string): string {
    const match = input.match(/(0x)?[0-9a-fA-F]{64}/);
    if (!match) {
      throw new Error('Nenhuma chave privada válida encontrada');
    }
    return match[0].startsWith('0x') ? match[0] : `0x${match[0]}`;
  }

  downloadKey(): void {
    const wallet = this._wallet();
    if (!wallet) {
      return;
    }
    const content = JSON.stringify(
      {
        address: wallet.address,
        privateKey: wallet.privateKey,
        createdAt: new Date().toISOString(),
      },
      null,
      2,
    );
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `besu-wallet-${wallet.address.slice(0, 10).toLowerCase()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  disconnect(): void {
    sessionStorage.removeItem(PK_KEY);
    this._wallet.set(null);
  }
}
