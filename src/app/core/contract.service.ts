import { Injectable, inject } from '@angular/core';
import { ContractFactory } from 'ethers';
import { NetworkService } from './network.service';
import { WalletService } from './wallet.service';

export interface CompiledContract {
  name: string;
  abi: any[];
  bytecode: string;
}

export interface DeployedContract {
  id: string;
  name: string;
  address: string;
  abi: any[];
  bytecode: string;
  deployedAt: string;
  txHash: string | null;
  rpcUrl: string;
  chainId: string;
}

export interface CompileError {
  severity: string;
  message: string;
  formattedMessage: string;
}

const CONTRACTS_KEY = 'besu.contracts';

@Injectable({ providedIn: 'root' })
export class ContractService {
  private readonly network = inject(NetworkService);
  private readonly wallet = inject(WalletService);

  private solcModule: any = null;

  // ---- Compilação ----

  loadSolc(): Promise<any> {
    if (this.solcModule) return Promise.resolve(this.solcModule);

    return new Promise<any>((resolve, reject) => {
      const win = window as any;
      if (win._besuSolc?.cwrap) {
        this.solcModule = win._besuSolc;
        resolve(this.solcModule);
        return;
      }
      win.Module = {
        onRuntimeInitialized: () => {
          this.solcModule = win.Module;
          win._besuSolc = win.Module;
          resolve(this.solcModule);
        },
      };
      const script = document.createElement('script');
      script.src = 'soljson.js';
      script.onerror = () => reject(new Error('Falha ao carregar o compilador Solidity'));
      document.head.appendChild(script);
    });
  }

  async compile(source: string): Promise<{ contracts: CompiledContract[]; errors: CompileError[] }> {
    const Module = await this.loadSolc();

    const input = JSON.stringify({
      language: 'Solidity',
      sources: { 'contract.sol': { content: source } },
      settings: { outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } } },
    });

    const compileFunc = Module.cwrap('solidity_compile', 'string', ['string', 'number']);
    const output = JSON.parse(compileFunc(input, 0));

    const errors: CompileError[] = (output.errors ?? []).filter(
      (e: any) => e.severity === 'error',
    );

    if (errors.length > 0) {
      return { contracts: [], errors };
    }

    const contracts: CompiledContract[] = [];
    const sources = output.contracts ?? {};
    for (const file of Object.values(sources) as any) {
      for (const [name, data] of Object.entries(file) as any) {
        const bytecode = data?.evm?.bytecode?.object ?? '';
        if (bytecode) {
          contracts.push({ name, abi: data.abi ?? [], bytecode });
        }
      }
    }

    return { contracts, errors: [] };
  }

  // ---- Deploy ----

  async deploy(
    contract: CompiledContract,
    constructorArgs: any[],
  ): Promise<{ address: string; txHash: string | null }> {
    const signer = this.wallet.wallet!.connect(this.network.provider);
    const factory = new ContractFactory(contract.abi, contract.bytecode, signer);

    const deployed = await factory.deploy(...constructorArgs, {
      gasPrice: 0n,
      gasLimit: 10_000_000n,
    });

    const receipt = await deployed.deploymentTransaction()?.wait();
    const address = await deployed.getAddress();

    const chainId = this.network.chainId?.toString() ?? '';
    this.saveContract({
      name: contract.name,
      address,
      abi: contract.abi,
      bytecode: contract.bytecode,
      deployedAt: new Date().toISOString(),
      txHash: receipt?.hash ?? null,
      rpcUrl: this.network.rpcUrl,
      chainId,
    });

    return { address, txHash: receipt?.hash ?? null };
  }

  // ---- Armazenamento local ----

  getContracts(): DeployedContract[] {
    try {
      return JSON.parse(localStorage.getItem(CONTRACTS_KEY) ?? '[]');
    } catch {
      return [];
    }
  }

  saveContract(data: Omit<DeployedContract, 'id'>): DeployedContract {
    const contracts = this.getContracts();
    const entry: DeployedContract = { ...data, id: Date.now().toString() };
    contracts.unshift(entry);
    localStorage.setItem(CONTRACTS_KEY, JSON.stringify(contracts));
    return entry;
  }

  deleteContract(id: string): void {
    const contracts = this.getContracts().filter((c) => c.id !== id);
    localStorage.setItem(CONTRACTS_KEY, JSON.stringify(contracts));
  }
}
