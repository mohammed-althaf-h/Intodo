import { TaskItem, ProfileType } from '../types';
import { CryptoEngine } from './cryptoEngine';

const STORAGE_PREFIX = 'intodo_vault_';

export class VaultStorage {
  private static getKey(profile: ProfileType): string {
    return `${STORAGE_PREFIX}${profile}`;
  }

  /**
   * Load tasks strictly for the specified profile vault
   */
  static loadTasks(profile: ProfileType): TaskItem[] {
    try {
      const raw = localStorage.getItem(this.getKey(profile));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((t) => t.profile === profile);
      }
      return [];
    } catch {
      console.warn(`[VaultStorage] Failed to read ${profile} vault, initializing empty.`);
      return [];
    }
  }

  /**
   * Save tasks strictly for the specified profile vault
   */
  static saveTasks(profile: ProfileType, tasks: TaskItem[]): void {
    try {
      // Ensure only tasks belonging to this profile are saved in this vault partition
      const filtered = tasks.filter((t) => t.profile === profile);
      localStorage.setItem(this.getKey(profile), JSON.stringify(filtered));
    } catch (err) {
      console.error(`[VaultStorage] Failed to save tasks to ${profile} vault:`, err);
    }
  }

  /**
   * Export all vaults or specific vault as an encrypted backup package
   */
  static async exportEncryptedBackup(
    passphrase: string,
    profile?: ProfileType
  ): Promise<string> {
    const backupData: Record<string, TaskItem[]> = {};

    if (profile) {
      backupData[profile] = this.loadTasks(profile);
    } else {
      backupData['work'] = this.loadTasks('work');
      backupData['personal'] = this.loadTasks('personal');
    }

    const payload = JSON.stringify({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      vaults: backupData,
    });

    return await CryptoEngine.encrypt(payload, passphrase);
  }

  /**
   * Restore vaults from an encrypted backup string
   */
  static async importEncryptedBackup(
    encryptedBackup: string,
    passphrase: string
  ): Promise<{ workCount: number; personalCount: number }> {
    const decryptedJson = await CryptoEngine.decrypt(encryptedBackup, passphrase);
    const parsed = JSON.parse(decryptedJson);

    if (!parsed.vaults) {
      throw new Error('Invalid backup file structure.');
    }

    let workCount = 0;
    let personalCount = 0;

    if (parsed.vaults.work) {
      this.saveTasks('work', parsed.vaults.work);
      workCount = parsed.vaults.work.length;
    }
    if (parsed.vaults.personal) {
      this.saveTasks('personal', parsed.vaults.personal);
      personalCount = parsed.vaults.personal.length;
    }

    return { workCount, personalCount };
  }

  /**
   * Wipe all local data for privacy / reset
   */
  static clearAllData(): void {
    localStorage.removeItem(this.getKey('work'));
    localStorage.removeItem(this.getKey('personal'));
  }
}
