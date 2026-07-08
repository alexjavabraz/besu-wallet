import { Component, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { copyText } from '../../core/clipboard';
import { WalletService } from '../../core/wallet.service';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [FormsModule, NgIf],
  templateUrl: './onboarding.html',
  styleUrls: ['./onboarding.scss'],
})
export class OnboardingPage {
  private readonly walletService = inject(WalletService);
  private readonly router = inject(Router);

  protected generatedAddress: string | null = null;
  protected generatedKey: string | null = null;
  protected keyDownloaded = false;
  protected importError: string | null = null;
  protected copyFeedback: { field: 'address' | 'key'; ok: boolean } | null = null;

  protected importInput = '';

  protected generate(): void {
    const wallet = this.walletService.generate();
    this.generatedAddress = wallet.address;
    this.generatedKey = wallet.privateKey;
    this.keyDownloaded = false;
  }

  private copyFeedbackResetTimeout: ReturnType<typeof setTimeout> | null = null;

  protected async copy(value: string | null, field: 'address' | 'key'): Promise<void> {
    if (!value) return;
    const ok = await copyText(value);
    this.copyFeedback = { field, ok };
    if (this.copyFeedbackResetTimeout) clearTimeout(this.copyFeedbackResetTimeout);
    this.copyFeedbackResetTimeout = setTimeout(() => {
      this.copyFeedback = null;
      this.copyFeedbackResetTimeout = null;
    }, 2500);
  }

  protected downloadKey(): void {
    this.walletService.downloadKey();
    this.keyDownloaded = true;
  }

  protected enter(): void {
    void this.router.navigate(['/carteira']);
  }

  protected importFromText(): void {
    this.importError = null;
    try {
      this.walletService.importKey(this.importInput);
      void this.router.navigate(['/carteira']);
    } catch (e) {
      this.importError = e instanceof Error ? e.message : 'Chave privada inválida';
    }
  }

  protected async importFromFile(event: Event): Promise<void> {
    this.importError = null;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const content = await file.text();
      this.walletService.importKey(content);
      void this.router.navigate(['/carteira']);
    } catch (e) {
      this.importError = e instanceof Error ? e.message : 'Arquivo inválido';
    } finally {
      input.value = '';
    }
  }
}
