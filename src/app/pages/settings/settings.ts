import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { hasInjection, isEvmAddress, isValidRpcUrl } from '../../core/input-validation';
import { NetworkService } from '../../core/network.service';
import { TokenService } from '../../core/token.service';

@Component({
  selector: 'app-settings',
  imports: [FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class SettingsPage {
  protected readonly networkService = inject(NetworkService);
  protected readonly tokenService = inject(TokenService);

  protected rpcInput = this.networkService.rpcUrl();
  protected tokenInput = this.tokenService.tokenAddress();

  protected readonly savingRpc = signal(false);
  protected readonly savingToken = signal(false);
  protected readonly rpcSaveError = signal<string | null>(null);
  protected readonly tokenSaveError = signal<string | null>(null);

  protected async saveRpc(): Promise<void> {
    this.rpcSaveError.set(null);
    const trimmed = this.rpcInput.trim();
    if (trimmed && !isValidRpcUrl(trimmed)) {
      this.rpcSaveError.set('URL inválida — use http:// ou https:// (ex.: http://besu-node:8545)');
      return;
    }
    this.savingRpc.set(true);
    try {
      await this.networkService.setRpcUrl(trimmed);
    } finally {
      this.savingRpc.set(false);
    }
  }

  protected async saveToken(): Promise<void> {
    this.tokenSaveError.set(null);
    const trimmed = this.tokenInput.trim();
    if (trimmed && (hasInjection(trimmed) || !isEvmAddress(trimmed))) {
      this.tokenSaveError.set('Endereço inválido — use o formato 0x + 40 caracteres hexadecimais');
      return;
    }
    this.savingToken.set(true);
    try {
      await this.tokenService.setTokenAddress(trimmed);
    } catch (e) {
      this.tokenSaveError.set(e instanceof Error ? e.message : 'Endereço inválido');
    } finally {
      this.savingToken.set(false);
    }
  }
}
