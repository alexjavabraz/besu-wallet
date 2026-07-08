import { Component, inject } from '@angular/core';
import { NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { hasInjection, isEvmAddress, isValidRpcUrl } from '../../core/input-validation';
import { NetworkService } from '../../core/network.service';
import { TokenService } from '../../core/token.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault],
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss'],
})
export class SettingsPage {
  protected readonly networkService = inject(NetworkService);
  protected readonly tokenService = inject(TokenService);

  protected rpcInput = this.networkService.rpcUrl;
  protected tokenInput = this.tokenService.tokenAddress;

  protected savingRpc = false;
  protected savingToken = false;
  protected rpcSaveError: string | null = null;
  protected tokenSaveError: string | null = null;

  protected async saveRpc(): Promise<void> {
    this.rpcSaveError = null;
    const trimmed = this.rpcInput.trim();
    if (trimmed && !isValidRpcUrl(trimmed)) {
      this.rpcSaveError = 'URL inválida — use http:// ou https:// (ex.: http://besu-node:8545)';
      return;
    }
    this.savingRpc = true;
    try {
      await this.networkService.setRpcUrl(trimmed);
    } finally {
      this.savingRpc = false;
    }
  }

  protected async saveToken(): Promise<void> {
    this.tokenSaveError = null;
    const trimmed = this.tokenInput.trim();
    if (trimmed && (hasInjection(trimmed) || !isEvmAddress(trimmed))) {
      this.tokenSaveError = 'Endereço inválido — use o formato 0x + 40 caracteres hexadecimais';
      return;
    }
    this.savingToken = true;
    try {
      await this.tokenService.setTokenAddress(trimmed);
    } catch (e) {
      this.tokenSaveError = e instanceof Error ? e.message : 'Endereço inválido';
    } finally {
      this.savingToken = false;
    }
  }
}
