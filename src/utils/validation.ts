export function sanitizeTitle(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

export function validateName(name: string, fieldName: string = 'Name'): { valid: boolean; error?: string } {
  const sanitized = sanitizeTitle(name);
  if (!sanitized) {
    return { valid: false, error: `${fieldName} is required.` };
  }
  if (sanitized.length < 2) {
    return { valid: false, error: `${fieldName} must be at least 2 characters.` };
  }
  if (sanitized.length > 50) {
    return { valid: false, error: `${fieldName} must be under 50 characters.` };
  }
  return { valid: true };
}
