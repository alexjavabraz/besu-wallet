import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  protected readonly tokenSaveError = signal<string | null>(null);

  protected async saveRpc(): Promise<void> {
    this.savingRpc.set(true);
    try {
      await this.networkService.setRpcUrl(this.rpcInput);
    } finally {
      this.savingRpc.set(false);
    }
  }

  protected async saveToken(): Promise<void> {
    this.savingToken.set(true);
    this.tokenSaveError.set(null);
    try {
      await this.tokenService.setTokenAddress(this.tokenInput);
    } catch (e) {
      this.tokenSaveError.set(e instanceof Error ? e.message : 'Endereço inválido');
    } finally {
      this.savingToken.set(false);
    }
  }
}
