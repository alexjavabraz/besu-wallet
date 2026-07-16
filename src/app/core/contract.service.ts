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

  private solcWorker: Worker | null = null;
  private readonly pendingCompiles = new Map<
    number,
    { resolve: (output: string) => void; reject: (err: Error) => void }
  >();
  private nextCompileId = 0;

  // ---- Compilação ----
  // O compilador Solidity (soljson.js) tem um binário WebAssembly maior que 8MB.
  // Navegadores baseados em Chromium proíbem WebAssembly.Compile síncrono na main
  // thread acima desse limite, então a compilação roda em uma Web Worker.

  private getSolcWorker(): Worker {
    if (this.solcWorker) return this.solcWorker;

    const worker = new Worker('solc.worker.js');
    worker.onmessage = (event: MessageEvent) => {
      const { id, output, error } = event.data;
      const job = this.pendingCompiles.get(id);
      if (!job) return;
      this.pendingCompiles.delete(id);
      if (error) {
        job.reject(new Error(error));
      } else {
        job.resolve(output);
      }
    };
    worker.onerror = () => {
      this.pendingCompiles.forEach((job) =>
        job.reject(new Error('Falha ao carregar o compilador Solidity')),
      );
      this.pendingCompiles.clear();
    };

    this.solcWorker = worker;
    return worker;
  }

  private runSolcCompile(input: string): Promise<string> {
    const worker = this.getSolcWorker();
    const id = this.nextCompileId++;

    return new Promise<string>((resolve, reject) => {
      this.pendingCompiles.set(id, { resolve, reject });
      worker.postMessage({ id, input });
    });
  }

  /** Pré-carrega o compilador na worker (usado para mostrar um spinner de carregamento). */
  loadSolc(): Promise<void> {
    const worker = this.getSolcWorker();
    const id = this.nextCompileId++;

    return new Promise<void>((resolve, reject) => {
      this.pendingCompiles.set(id, { resolve: () => resolve(), reject });
      worker.postMessage({ id, warmup: true });
    });
  }

  async compile(source: string): Promise<{ contracts: CompiledContract[]; errors: CompileError[] }> {
    const input = JSON.stringify({
      language: 'Solidity',
      sources: { 'contract.sol': { content: source } },
      settings: { outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } } },
    });

    const output = JSON.parse(await this.runSolcCompile(input));

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
