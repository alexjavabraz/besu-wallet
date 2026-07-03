import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { WalletService } from './wallet.service';

export const walletGuard: CanActivateFn = () => {
  const walletService = inject(WalletService);
  const router = inject(Router);
  return walletService.hasWallet() ? true : router.createUrlTree(['/acesso']);
};

export const noWalletGuard: CanActivateFn = () => {
  const walletService = inject(WalletService);
  const router = inject(Router);
  return walletService.hasWallet() ? router.createUrlTree(['/carteira']) : true;
};
