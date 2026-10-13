/**
 * Environment catalogue. Add a new entry to target another deployment
 * (e.g. a staging clone) and select it with `TEST_ENV=<name>`.
 */
export interface EnvironmentConfig {
  /** Web UI origin */
  baseURL: string;
  /** Backend REST API origin */
  apiURL: string;
}

export const environments = {
  prod: {
    baseURL: 'https://www.demoblaze.com',
    apiURL: 'https://api.demoblaze.com',
  },
  // Example of how another environment would be declared:
  // staging: { baseURL: 'https://staging.demoblaze.example', apiURL: 'https://api.staging.demoblaze.example' },
} satisfies Record<string, EnvironmentConfig>;

export type EnvironmentName = keyof typeof environments;
