import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { copyText } from '../../core/clipboard';
import { WalletService } from '../../core/wallet.service';

@Component({
  selector: 'app-onboarding',
  imports: [FormsModule],
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.scss',
})
export class OnboardingPage {
  private readonly walletService = inject(WalletService);
  private readonly router = inject(Router);

  protected readonly generatedAddress = signal<string | null>(null);
  protected readonly generatedKey = signal<string | null>(null);
  protected readonly keyDownloaded = signal(false);
  protected readonly importError = signal<string | null>(null);
  protected readonly copyFeedback = signal<{ field: 'address' | 'key'; ok: boolean } | null>(
    null,
  );

  protected importInput = '';

  protected generate(): void {
    const wallet = this.walletService.generate();
    this.generatedAddress.set(wallet.address);
    this.generatedKey.set(wallet.privateKey);
    this.keyDownloaded.set(false);
  }

  protected async copy(value: string | null, field: 'address' | 'key'): Promise<void> {
    if (!value) {
      return;
    }
    const ok = await copyText(value);
    this.copyFeedback.set({ field, ok });
    setTimeout(() => this.copyFeedback.set(null), 2500);
  }

  protected downloadKey(): void {
    this.walletService.downloadKey();
    this.keyDownloaded.set(true);
  }

  protected enter(): void {
    void this.router.navigate(['/carteira']);
  }

  protected importFromText(): void {
    this.importError.set(null);
    try {
      this.walletService.importKey(this.importInput);
      void this.router.navigate(['/carteira']);
    } catch (e) {
      this.importError.set(e instanceof Error ? e.message : 'Chave privada inválida');
    }
  }

  protected async importFromFile(event: Event): Promise<void> {
    this.importError.set(null);
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    try {
      const content = await file.text();
      this.walletService.importKey(content);
      void this.router.navigate(['/carteira']);
    } catch (e) {
      this.importError.set(e instanceof Error ? e.message : 'Arquivo inválido');
    } finally {
      input.value = '';
    }
  }
}
