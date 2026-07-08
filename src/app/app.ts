import { Component, inject } from '@angular/core';
import { NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NetworkService } from './core/network.service';
import { WalletService } from './core/wallet.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App {
  protected readonly walletService = inject(WalletService);
  protected readonly networkService = inject(NetworkService);
  private readonly router = inject(Router);

  protected exit(): void {
    this.walletService.disconnect();
    void this.router.navigate(['/acesso']);
  }
}
