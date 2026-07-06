/**
 * Validação de entradas do usuário — OWASP Top 10 (A03 Injection, A04 Insecure Design).
 * Toda entrada digitada pelo usuário passa por aqui antes de ser usada.
 */

const INJECTION_PATTERNS: RegExp[] = [
  /<[^>]+>/, // tags HTML
  /javascript:/i,
  /on\w+\s*=/i, // event handlers inline
  /\.\.[\/\\]/, // path traversal
  /&#x?[0-9a-f]+;/i, // entidades HTML
];

export function hasInjection(value: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(value));
}

export const EVM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;

export function isEvmAddress(value: string): boolean {
  return EVM_ADDRESS_REGEX.test(value.trim());
}

/**
 * Valida um valor decimal digitado pelo usuário e o normaliza (vírgula → ponto).
 * Retorna null para qualquer entrada que não seja um número positivo finito —
 * inclusive as que gerariam NaN (ex.: "abc", "1,2,3", "1e5", "").
 */
export function parseDecimalInput(value: string): string | null {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return normalized;
}

export function isValidRpcUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || hasInjection(trimmed)) {
    return false;
  }
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Mensagem de erro curta e legível a partir de exceções (ethers gera mensagens enormes). */
export function errorMessage(e: unknown, fallback: string): string {
  const message = e instanceof Error ? e.message : fallback;
  return message.length > 140 ? `${message.slice(0, 140)}…` : message;
}
