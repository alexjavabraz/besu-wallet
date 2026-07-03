# BESU WALLET

Single Page Application em Angular para interagir com um nó **Hyperledger Besu** em rede permissionada.
Sem banco de dados e sem BFF — toda a comunicação é feita direto do navegador via JSON-RPC (ethers.js v6).
Identidade visual baseada no Guia da Marca Núclea (DM Mono / DM Sans, preto + lilás + lima + verde).

> Ambiente controlado de desenvolvimento, acessado apenas via VPN.

## Funcionalidades

- **Gerar conta**: par de chaves criado localmente no navegador (`ethers.Wallet.createRandom`), com download da chave privada em arquivo JSON para reutilização.
- **Importar conta**: colando a chave privada ou enviando o arquivo baixado anteriormente.
- **Configurar nó**: endereço JSON-RPC do nó Besu (persistido em `localStorage`), com teste de conexão (chain id + bloco atual).
- **Saldo nativo**: consulta do token nativo da rede.
- **Token ERC-20**: configuração do endereço do contrato, leitura de nome/símbolo/decimais e consulta de saldo.
- **Transferências**: envio do token nativo e do token ERC-20 assinados localmente com a chave importada.

A chave privada fica apenas em `sessionStorage` (sessão do navegador) — ao fechar a aba é necessário importá-la novamente.

## Requisitos

- Node.js >= 22
- Navegadores-alvo: Microsoft Edge 149+ (desktop) e Chrome (mobile)

## Desenvolvimento

```bash
npm install
npm start          # http://localhost:4200
```

## Build de produção

```bash
npm run build      # saída em dist/besu-wallet/browser
```

O resultado é estático — pode ser servido por qualquer web server (nginx, S3, etc.).

> **CORS**: o nó Besu precisa aceitar requisições do origin da SPA. Ex.:
> `--rpc-http-cors-origins="*"` (ou o origin específico) na inicialização do Besu.

## Estrutura

```
src/app/
  core/
    network.service.ts   # provider JSON-RPC + configuração do nó
    wallet.service.ts    # geração/importação/download da chave
    token.service.ts     # contrato ERC-20 (metadados, saldo, transfer)
    wallet.guard.ts      # guards de rota (com/sem carteira)
  pages/
    onboarding/          # /acesso  — criar ou importar conta
    dashboard/           # /carteira — saldos e transferências
    settings/            # /config  — nó RPC + contrato ERC-20
```
