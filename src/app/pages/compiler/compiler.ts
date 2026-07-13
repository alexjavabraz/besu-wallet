import { Component, OnInit, inject } from '@angular/core';
import { NgIf, NgFor, JsonPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CompiledContract, CompileError, ContractService } from '../../core/contract.service';
import { NetworkService } from '../../core/network.service';
import { WalletService } from '../../core/wallet.service';

const DEFAULT_SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MeuContrato {
    string public mensagem;

    constructor(string memory _mensagem) {
        mensagem = _mensagem;
    }

    function setMensagem(string memory _nova) public {
        mensagem = _nova;
    }
}`;

@Component({
  selector: 'app-compiler',
  standalone: true,
  imports: [FormsModule, NgIf, NgFor, RouterLink, JsonPipe],
  templateUrl: './compiler.html',
  styleUrls: ['./compiler.scss'],
})
export class CompilerPage implements OnInit {
  private readonly contractService = inject(ContractService);
  protected readonly networkService = inject(NetworkService);
  protected readonly walletService = inject(WalletService);

  protected sourceCode = DEFAULT_SOURCE;

  protected loadingSolc = false;
  protected compiling = false;
  protected deploying = false;

  protected compileErrors: CompileError[] = [];
  protected compiledContracts: CompiledContract[] = [];
  protected selectedContractName = '';

  protected constructorArgsInput = '';
  protected constructorArgsError: string | null = null;

  protected deployedAddress: string | null = null;
  protected deployedTxHash: string | null = null;
  protected deployError: string | null = null;

  get selectedContract(): CompiledContract | null {
    return this.compiledContracts.find((c) => c.name === this.selectedContractName) ?? null;
  }

  get hasConstructorArgs(): boolean {
    const ctor = this.selectedContract?.abi.find((e: any) => e.type === 'constructor');
    return (ctor?.inputs?.length ?? 0) > 0;
  }

  get constructorInputs(): any[] {
    return this.selectedContract?.abi.find((e: any) => e.type === 'constructor')?.inputs ?? [];
  }

  ngOnInit(): void {
    this.loadingSolc = true;
    this.contractService
      .loadSolc()
      .then(() => (this.loadingSolc = false))
      .catch(() => (this.loadingSolc = false));
  }

  protected async compile(): Promise<void> {
    this.compiling = true;
    this.compileErrors = [];
    this.compiledContracts = [];
    this.selectedContractName = '';
    this.deployedAddress = null;
    this.deployedTxHash = null;
    this.deployError = null;

    try {
      const result = await this.contractService.compile(this.sourceCode);
      this.compileErrors = result.errors;
      this.compiledContracts = result.contracts;
      if (result.contracts.length > 0) {
        this.selectedContractName = result.contracts[result.contracts.length - 1].name;
      }
    } catch (e) {
      this.compileErrors = [
        {
          severity: 'error',
          message: e instanceof Error ? e.message : 'Erro desconhecido na compilação',
          formattedMessage: e instanceof Error ? e.message : 'Erro desconhecido',
        },
      ];
    } finally {
      this.compiling = false;
    }
  }

  protected async deploy(): Promise<void> {
    const contract = this.selectedContract;
    if (!contract) return;

    this.constructorArgsError = null;
    this.deployError = null;
    this.deployedAddress = null;
    this.deployedTxHash = null;

    let args: any[] = [];
    if (this.hasConstructorArgs) {
      try {
        const parsed = JSON.parse(this.constructorArgsInput || '[]');
        args = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        this.constructorArgsError = 'Argumentos inválidos — informe um array JSON. Ex: ["texto", 123]';
        return;
      }
    }

    this.deploying = true;
    try {
      const result = await this.contractService.deploy(contract, args);
      this.deployedAddress = result.address;
      this.deployedTxHash = result.txHash;
    } catch (e) {
      this.deployError = e instanceof Error ? e.message : 'Falha no deploy';
    } finally {
      this.deploying = false;
    }
  }
}
