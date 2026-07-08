import { Component, OnInit, inject } from '@angular/core';
import { NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';
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
  standalone: true,
  imports: [FormsModule, RouterLink, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class DashboardPage implements OnInit {
  protected readonly walletService = inject(WalletService);
  protected readonly networkService = inject(NetworkService);
  protected readonly tokenService = inject(TokenService);

  protected nativeBalance: string | null = null;
  protected tokenBalance: string | null = null;
  protected loadingBalances = false;
  protected nativeBalanceError: string | null = null;
  protected tokenBalanceError: string | null = null;
  protected copyState: 'idle' | 'ok' | 'error' = 'idle';
  protected nativeTx: TxState = { ...IDLE_TX };
  protected tokenTx: TxState = { ...IDLE_TX };

  protected nativeTo = '';
  protected nativeAmount = '';
  protected tokenTo = '';
  protected tokenAmount = '';

  ngOnInit(): void {
    void this.refresh();
  }

  protected async refresh(): Promise<void> {
    if (!this.networkService.configured) return;
    const address = this.walletService.address;
    if (!address) return;

    this.loadingBalances = true;
    this.nativeBalance = null;
    this.tokenBalance = null;
    this.nativeBalanceError = null;
    this.tokenBalanceError = null;

    try {
      const native = await this.networkService.provider.getBalance(address);
      this.nativeBalance = formatEther(native);
    } catch (e) {
      this.nativeBalanceError = `Falha ao consultar o nó RPC: ${errorMessage(e, 'erro de conexão')}`;
    }

    if (this.tokenService.configured) {
      try {
        if (!this.tokenService.symbol) await this.tokenService.loadMetadata();
        const balance = await this.tokenService.balanceOf(address);
        this.tokenBalance = formatUnits(balance, this.tokenService.decimals);
      } catch (e) {
        this.tokenBalanceError = `Falha ao consultar o token ERC-20: ${errorMessage(e, 'erro ao ler o contrato')}`;
      }
    }

    this.loadingBalances = false;
  }

  protected async copyAddress(): Promise<void> {
    const address = this.walletService.address;
    if (!address) return;
    const ok = await copyText(address);
    this.copyState = ok ? 'ok' : 'error';
    setTimeout(() => (this.copyState = 'idle'), 2500);
  }

  protected async sendNative(): Promise<void> {
    const amount = this.validateTransfer(this.nativeTo, this.nativeAmount, 'native');
    if (amount === null) return;
    this.nativeTx = { sending: true, hash: null, error: null };
    try {
      const signer = this.walletService.wallet!.connect(this.networkService.provider);
      const tx = await signer.sendTransaction({
        to: this.nativeTo.trim(),
        value: parseEther(amount),
      });
      await tx.wait();
      this.nativeTx = { sending: false, hash: tx.hash, error: null };
      this.nativeTo = '';
      this.nativeAmount = '';
      void this.refresh();
    } catch (e) {
      this.nativeTx = {
        sending: false,
        hash: null,
        error: `Falha no envio do token nativo: ${errorMessage(e, 'transação rejeitada')}`,
      };
    }
  }

  protected async sendToken(): Promise<void> {
    const amount = this.validateTransfer(this.tokenTo, this.tokenAmount, 'token');
    if (amount === null) return;
    this.tokenTx = { sending: true, hash: null, error: null };
    try {
      const signer = this.walletService.wallet!.connect(this.networkService.provider);
      const contract = this.tokenService.contract(signer);
      const value = parseUnits(amount, this.tokenService.decimals);
      const tx = await contract.getFunction('transfer')(this.tokenTo.trim(), value);
      await tx.wait();
      this.tokenTx = { sending: false, hash: tx.hash, error: null };
      this.tokenTo = '';
      this.tokenAmount = '';
      void this.refresh();
    } catch (e) {
      this.tokenTx = {
        sending: false,
        hash: null,
        error: `Falha no envio do token ERC-20: ${errorMessage(e, 'transação rejeitada')}`,
      };
    }
  }

  private validateTransfer(to: string, amount: string, type: 'native' | 'token'): string | null {
    const fail = (error: string): null => {
      if (type === 'native') this.nativeTx = { sending: false, hash: null, error };
      else this.tokenTx = { sending: false, hash: null, error };
      return null;
    };
    if (!this.networkService.configured) return fail('Configure o endereço do nó antes de enviar');
    const destination = to.trim();
    if (hasInjection(destination) || !isEvmAddress(destination)) {
      return fail('Endereço de destino inválido — use o formato 0x + 40 caracteres hexadecimais');
    }
    const normalized = parseDecimalInput(amount);
    if (normalized === null) return fail('Valor inválido — informe apenas números maiores que zero (ex.: 1.5)');
    return normalized;
  }
}
