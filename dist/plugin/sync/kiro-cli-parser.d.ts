export declare function getCliDbPath(): string
export declare function safeJsonParse(value: unknown): any | null
export declare function normalizeExpiresAt(input: unknown): number
export declare function findClientCredsRecursive(input: unknown): {
  clientId?: string
  clientSecret?: string
}
export declare function makePlaceholderEmail(
  authMethod: string,
  region: string,
  clientId?: string,
  profileArn?: string
): string
