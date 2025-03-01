import { hc } from 'hono/client';
import { type ApiRoutes } from '../../../server/src/app';

const client = hc<ApiRoutes>('/');

export const api = client.api;
