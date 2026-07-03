import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { formatEther, formatUnits, isAddress, parseEther, parseUnits } from 'ethers';
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
  protected readonly balanceError = signal<string | null>(null);
  protected readonly copied = signal(false);

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
    this.loadingBalances.set(true);
    this.balanceError.set(null);
    try {
      const native = await this.networkService.provider.getBalance(address);
      this.nativeBalance.set(formatEther(native));

      if (this.tokenService.configured()) {
        if (!this.tokenService.symbol()) {
          await this.tokenService.loadMetadata();
        }
        const balance = await this.tokenService.balanceOf(address);
        this.tokenBalance.set(formatUnits(balance, this.tokenService.decimals()));
      }
    } catch (e) {
      this.balanceError.set(e instanceof Error ? e.message : 'Falha ao consultar saldos');
    } finally {
      this.loadingBalances.set(false);
    }
  }

  protected async copyAddress(): Promise<void> {
    const address = this.walletService.address();
    if (!address) {
      return;
    }
    await navigator.clipboard.writeText(address);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  protected async sendNative(): Promise<void> {
    if (!this.validate(this.nativeTo, this.nativeAmount, this.nativeTx)) {
      return;
    }
    this.nativeTx.set({ sending: true, hash: null, error: null });
    try {
      const signer = this.walletService.wallet()!.connect(this.networkService.provider);
      const tx = await signer.sendTransaction({
        to: this.nativeTo.trim(),
        value: parseEther(this.nativeAmount.trim()),
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
        error: e instanceof Error ? e.message : 'Falha ao enviar transação',
      });
    }
  }

  protected async sendToken(): Promise<void> {
    if (!this.validate(this.tokenTo, this.tokenAmount, this.tokenTx)) {
      return;
    }
    this.tokenTx.set({ sending: true, hash: null, error: null });
    try {
      const signer = this.walletService.wallet()!.connect(this.networkService.provider);
      const contract = this.tokenService.contract(signer);
      const amount = parseUnits(this.tokenAmount.trim(), this.tokenService.decimals());
      const tx = await contract.getFunction('transfer')(this.tokenTo.trim(), amount);
      await tx.wait();
      this.tokenTx.set({ sending: false, hash: tx.hash, error: null });
      this.tokenTo = '';
      this.tokenAmount = '';
      void this.refresh();
    } catch (e) {
      this.tokenTx.set({
        sending: false,
        hash: null,
        error: e instanceof Error ? e.message : 'Falha ao enviar transação',
      });
    }
  }

  private validate(to: string, amount: string, state: typeof this.nativeTx): boolean {
    if (!this.networkService.configured()) {
      state.set({ sending: false, hash: null, error: 'Configure o endereço do nó primeiro' });
      return false;
    }
    if (!isAddress(to.trim())) {
      state.set({ sending: false, hash: null, error: 'Endereço de destino inválido' });
      return false;
    }
    if (!amount.trim() || Number(amount) <= 0) {
      state.set({ sending: false, hash: null, error: 'Informe um valor maior que zero' });
      return false;
    }
    return true;
  }
}
