import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { formatEther, formatUnits, parseEther, parseUnits } from 'ethers';
import { copyText } from '../../core/clipboard';
import {
  errorMessage,
  hasInjection,
  isEvmAddress,
  parseDecimalInput,
} from '../../core/input-validation';
import { NetworkService } from '../../core/network.service';
import { TokenService } from '../../core/token.service';
import { WalletService } from '../../core/wallet.service';

interface TxState {
  sending: boolean;
  hash: string | null;
  error: string | null;
}

const IDLE_TX: TxState = { sending: false, hash: null, error: null };

@Component({
  selector: 'app-dashboard',
  imports: [FormsModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardPage implements OnInit {
  protected readonly walletService = inject(WalletService);
  protected readonly networkService = inject(NetworkService);
  protected readonly tokenService = inject(TokenService);

  protected readonly nativeBalance = signal<string | null>(null);
  protected readonly tokenBalance = signal<string | null>(null);
  protected readonly loadingBalances = signal(false);
  protected readonly nativeBalanceError = signal<string | null>(null);
  protected readonly tokenBalanceError = signal<string | null>(null);
  protected readonly copyState = signal<'idle' | 'ok' | 'error'>('idle');

  protected readonly nativeTx = signal<TxState>(IDLE_TX);
  protected readonly tokenTx = signal<TxState>(IDLE_TX);

  protected nativeTo = '';
  protected nativeAmount = '';
  protected tokenTo = '';
  protected tokenAmount = '';

  ngOnInit(): void {
    void this.refresh();
  }

  protected async refresh(): Promise<void> {
    if (!this.networkService.configured()) {
      return;
    }
    const address = this.walletService.address();
    if (!address) {
      return;
    }
    // Zera os valores no início para nunca exibir saldo desatualizado após uma falha
    this.loadingBalances.set(true);
    this.nativeBalance.set(null);
    this.tokenBalance.set(null);
    this.nativeBalanceError.set(null);
    this.tokenBalanceError.set(null);

    try {
      const native = await this.networkService.provider.getBalance(address);
      this.nativeBalance.set(formatEther(native));
    } catch (e) {
      this.nativeBalanceError.set(
        `Falha ao consultar o nó RPC: ${errorMessage(e, 'erro de conexão')}`,
      );
    }

    if (this.tokenService.configured()) {
      try {
        if (!this.tokenService.symbol()) {
          await this.tokenService.loadMetadata();
        }
        const balance = await this.tokenService.balanceOf(address);
        this.tokenBalance.set(formatUnits(balance, this.tokenService.decimals()));
      } catch (e) {
        this.tokenBalanceError.set(
          `Falha ao consultar o token ERC-20: ${errorMessage(e, 'erro ao ler o contrato')}`,
        );
      }
    }

    this.loadingBalances.set(false);
  }

  protected async copyAddress(): Promise<void> {
    const address = this.walletService.address();
    if (!address) {
      return;
    }
    const ok = await copyText(address);
    this.copyState.set(ok ? 'ok' : 'error');
    setTimeout(() => this.copyState.set('idle'), 2500);
  }

  protected async sendNative(): Promise<void> {
    const amount = this.validateTransfer(this.nativeTo, this.nativeAmount, this.nativeTx);
    if (amount === null) {
      return;
    }
    this.nativeTx.set({ sending: true, hash: null, error: null });
    try {
      const signer = this.walletService.wallet()!.connect(this.networkService.provider);
      const tx = await signer.sendTransaction({
        to: this.nativeTo.trim(),
        value: parseEther(amount),
      });
      await tx.wait();
      this.nativeTx.set({ sending: false, hash: tx.hash, error: null });
      this.nativeTo = '';
      this.nativeAmount = '';
      void this.refresh();
    } catch (e) {
      this.nativeTx.set({
        sending: false,
        hash: null,
        error: `Falha no envio do token nativo: ${errorMessage(e, 'transação rejeitada')}`,
      });
    }
  }

  protected async sendToken(): Promise<void> {
    const amount = this.validateTransfer(this.tokenTo, this.tokenAmount, this.tokenTx);
    if (amount === null) {
      return;
    }
    this.tokenTx.set({ sending: true, hash: null, error: null });
    try {
      const signer = this.walletService.wallet()!.connect(this.networkService.provider);
      const contract = this.tokenService.contract(signer);
      const value = parseUnits(amount, this.tokenService.decimals());
      const tx = await contract.getFunction('transfer')(this.tokenTo.trim(), value);
      await tx.wait();
      this.tokenTx.set({ sending: false, hash: tx.hash, error: null });
      this.tokenTo = '';
      this.tokenAmount = '';
      void this.refresh();
    } catch (e) {
      this.tokenTx.set({
        sending: false,
        hash: null,
        error: `Falha no envio do token ERC-20: ${errorMessage(e, 'transação rejeitada')}`,
      });
    }
  }

  /**
   * Valida destino e valor antes de montar a transação.
   * Retorna o valor decimal normalizado, ou null se a entrada for rejeitada —
   * nunca deixa passar valores que virariam NaN (ex.: "abc", "1,2,3").
   */
  private validateTransfer(
    to: string,
    amount: string,
    state: typeof this.nativeTx,
  ): string | null {
    const fail = (error: string): null => {
      state.set({ sending: false, hash: null, error });
      return null;
    };
    if (!this.networkService.configured()) {
      return fail('Configure o endereço do nó antes de enviar');
    }
    const destination = to.trim();
    if (hasInjection(destination) || !isEvmAddress(destination)) {
      return fail('Endereço de destino inválido — use o formato 0x + 40 caracteres hexadecimais');
    }
    const normalized = parseDecimalInput(amount);
    if (normalized === null) {
      return fail('Valor inválido — informe apenas números maiores que zero (ex.: 1.5)');
    }
    return normalized;
  }
}
