import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NetworkService } from './core/network.service';
import { WalletService } from './core/wallet.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
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
