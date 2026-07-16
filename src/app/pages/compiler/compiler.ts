import { Component, OnInit, inject } from '@angular/core';
import { NgIf, NgFor, KeyValuePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CompiledContract, CompileError, ContractService } from '../../core/contract.service';
import { NetworkService } from '../../core/network.service';
import { WalletService } from '../../core/wallet.service';
import { ERC_TEMPLATES } from './erc-templates';

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
  imports: [FormsModule, NgIf, NgFor, RouterLink, KeyValuePipe],
  templateUrl: './compiler.html',
  styleUrls: ['./compiler.scss'],
})
export class CompilerPage implements OnInit {
  private readonly contractService = inject(ContractService);
  protected readonly networkService = inject(NetworkService);
  protected readonly walletService = inject(WalletService);

  protected readonly ercTemplates = ERC_TEMPLATES;
  protected selectedTemplate = '';
  protected sourceCode = DEFAULT_SOURCE;

  protected loadingSolc = false;
  protected compiling = false;
  protected deploying = false;

  protected compileErrors: CompileError[] = [];
  protected compiledContracts: CompiledContract[] = [];
  protected selectedContractName = '';

  protected constructorArgValues: string[] = [];
  protected constructorArgsError: string | null = null;

  protected deployedAddress: string | null = null;
  protected deployedTxHash: string | null = null;
  protected deployError: string | null = null;

  get selectedContract(): CompiledContract | null {
    return this.compiledContracts.find((c) => c.name === this.selectedContractName) ?? null;
  }

  get hasConstructorArgs(): boolean {
    return this.constructorInputs.length > 0;
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

  protected onTemplateChange(key: string): void {
    if (!key) return;
    const template = this.ercTemplates[key];
    if (!template) return;
    this.sourceCode = template.source;
    this.compileErrors = [];
    this.compiledContracts = [];
    this.selectedContractName = '';
    this.constructorArgValues = [];
    this.deployedAddress = null;
    this.deployedTxHash = null;
    this.deployError = null;
  }

  protected onContractSelect(name: string): void {
    this.selectedContractName = name;
    this.resetConstructorArgs();
  }

  private resetConstructorArgs(): void {
    this.constructorArgValues = this.constructorInputs.map(() => '');
    this.constructorArgsError = null;
  }

  protected argPlaceholder(type: string): string {
    if (type.endsWith('[]')) return `${this.argPlaceholder(type.slice(0, -2))}, ...`;
    if (type === 'address') return '0x0000000000000000000000000000000000000000';
    if (type === 'bool') return 'true ou false';
    if (type.startsWith('uint') || type.startsWith('int')) return '1000';
    if (type.startsWith('bytes')) return '0x...';
    return 'texto';
  }

  protected async compile(): Promise<void> {
    this.compiling = true;
    this.compileErrors = [];
    this.compiledContracts = [];
    this.selectedContractName = '';
    this.constructorArgValues = [];
    this.deployedAddress = null;
    this.deployedTxHash = null;
    this.deployError = null;

    try {
      const result = await this.contractService.compile(this.sourceCode);
      this.compileErrors = result.errors;
      this.compiledContracts = result.contracts;
      if (result.contracts.length > 0) {
        this.selectedContractName = result.contracts[result.contracts.length - 1].name;
        this.resetConstructorArgs();
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

  private coerceArgValue(type: string, raw: string): any {
    const value = raw.trim();
    if (type.endsWith('[]')) {
      const itemType = type.slice(0, -2);
      const items = value.startsWith('[') ? JSON.parse(value) : value.split(',').map((v) => v.trim());
      return items.filter((v: string) => v !== '').map((v: any) => this.coerceArgValue(itemType, String(v)));
    }
    if (type === 'bool') {
      return value.toLowerCase() === 'true' || value === '1';
    }
    if (type.startsWith('uint') || type.startsWith('int')) {
      return BigInt(value);
    }
    return value;
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
        args = this.constructorInputs.map((input, i) =>
          this.coerceArgValue(input.type, this.constructorArgValues[i] ?? ''),
        );
      } catch {
        this.constructorArgsError = 'Argumento inválido — confira os tipos esperados de cada campo.';
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
