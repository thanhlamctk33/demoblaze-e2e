import environmentsJson from './environments.json';

export interface EnvironmentConfig {
  baseURL: string;
  apiURL: string;
}

export const environments: Record<string, EnvironmentConfig> = environmentsJson;
