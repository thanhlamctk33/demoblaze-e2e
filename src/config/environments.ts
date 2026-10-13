export interface EnvironmentConfig {
  baseURL: string;
  apiURL: string;
}

export const environments = {
  prod: {
    baseURL: 'https://www.demoblaze.com',
    apiURL: 'https://api.demoblaze.com',
  },
} satisfies Record<string, EnvironmentConfig>;

export type EnvironmentName = keyof typeof environments;
