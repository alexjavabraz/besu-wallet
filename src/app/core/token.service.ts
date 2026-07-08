import { Injectable, inject } from '@angular/core';
import { Contract, ContractRunner, isAddress } from 'ethers';
import { NetworkService } from './network.service';

const TOKEN_KEY = 'besu.tokenAddress';

const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
];

@Injectable({ providedIn: 'root' })
export class TokenService {
  private readonly network = inject(NetworkService);

  tokenAddress: string = localStorage.getItem(TOKEN_KEY) ?? '';
  name: string | null = null;
  symbol: string | null = null;
  decimals: number = 18;
  error: string | null = null;

  get configured(): boolean { return this.tokenAddress.length > 0; }

  contract(runner: ContractRunner = this.network.provider): Contract {
    return new Contract(this.tokenAddress, ERC20_ABI, runner);
  }

  async setTokenAddress(address: string): Promise<void> {
    const trimmed = address.trim();
    if (trimmed && !isAddress(trimmed)) throw new Error('Endereço de contrato inválido');
    localStorage.setItem(TOKEN_KEY, trimmed);
    this.tokenAddress = trimmed;
    this.name = null;
    this.symbol = null;
    this.decimals = 18;
    this.error = null;
    if (trimmed) await this.loadMetadata();
  }

  async loadMetadata(): Promise<void> {
    if (!this.configured) return;
    this.error = null;
    try {
      const contract = this.contract();
      const [name, symbol, decimals] = await Promise.all([
        contract.getFunction('name')(),
        contract.getFunction('symbol')(),
        contract.getFunction('decimals')(),
      ]);
      this.name = name;
      this.symbol = symbol;
      this.decimals = Number(decimals);
    } catch {
      this.error = 'Não foi possível ler o contrato ERC-20 neste endereço';
    }
  }

  async balanceOf(owner: string): Promise<bigint> {
    return this.contract().getFunction('balanceOf')(owner);
  }
}
