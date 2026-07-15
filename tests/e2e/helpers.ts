/**
 * Utilidades compartidas para los tests E2E de la plataforma Web de MusicProvider.
 * Aquí se centraliza la configuración de endpoints y helpers reutilizables.
 * Aún no contiene casos de prueba; es la base sobre la cual se escribirán.
 */
import { APIRequestContext, expect } from '@playwright/test';

export const API_ENDPOINTS = {
  search: '/api/search',
  info: '/api/info',
  playlist: '/api/playlist',
  download: '/api/download',
} as const;

/** Verifica que el servidor Express responda en el endpoint de búsqueda. */
export async function ensureServerHealthy(request: APIRequestContext): Promise<void> {
  const response = await request.get(`${API_ENDPOINTS.search}?q=test&limit=1`);
  expect([200, 400, 500]).toContain(response.status());
}
