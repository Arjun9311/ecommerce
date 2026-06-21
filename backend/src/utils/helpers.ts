import { v7 as uuidv7 } from 'uuid';

export function createId(domain: string): string {
  return `${domain}:${uuidv7()}`;
}

export function parseId(id: string): { domain: string; uuid: string } {
  const colonIndex = id.indexOf(':');
  return {
    domain: id.substring(0, colonIndex),
    uuid: id.substring(colonIndex + 1),
  };
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatPrice(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount / 100);
}

export function paginateArray<T>(arr: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return arr.slice(start, start + pageSize);
}

export function generateRandomVector(dim = 384): number[] {
  const v = Array.from({ length: dim }, () => Math.random() * 2 - 1);
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return v.map((x) => x / norm);
}
