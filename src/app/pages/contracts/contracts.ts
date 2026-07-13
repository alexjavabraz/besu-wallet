import { Component, OnInit, inject } from '@angular/core';
import { NgIf, NgFor, DatePipe, JsonPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ContractService, DeployedContract } from '../../core/contract.service';
import { copyText } from '../../core/clipboard';

@Component({
  selector: 'app-contracts',
  standalone: true,
  imports: [NgIf, NgFor, RouterLink, DatePipe, JsonPipe],
  templateUrl: './contracts.html',
  styleUrls: ['./contracts.scss'],
})
export class ContractsPage implements OnInit {
  private readonly contractService = inject(ContractService);

  protected contracts: DeployedContract[] = [];
  protected expandedAbi: string | null = null;
  protected copiedId: string | null = null;

  ngOnInit(): void {
    this.contracts = this.contractService.getContracts();
  }

  protected toggleAbi(id: string): void {
    this.expandedAbi = this.expandedAbi === id ? null : id;
  }

  protected async copyAddress(contract: DeployedContract): Promise<void> {
    await copyText(contract.address);
    this.copiedId = contract.id;
    setTimeout(() => (this.copiedId = null), 2500);
  }

  protected deleteContract(id: string): void {
    this.contractService.deleteContract(id);
    this.contracts = this.contractService.getContracts();
  }
}
