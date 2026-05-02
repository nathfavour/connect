import { KylrixApp } from '../design';

export interface ExtensionManifest {
  id: string;
  name: string;
  description: string;
  app: KylrixApp;
  href?: string;
  icon?: string;
  tags?: string[];
}

export function createExtensionManifest(manifest: ExtensionManifest): ExtensionManifest {
  return manifest;
}
