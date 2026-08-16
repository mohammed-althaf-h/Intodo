import { TaskItem, DelegatedTaskPayload } from '../types';
import { CryptoEngine } from './cryptoEngine';

export interface SyncMessage {
  type: 'TASK_DELEGATED' | 'VAULT_UPDATED' | 'PING';
  roomId: string;
  encryptedPayload: string;
  timestamp: number;
}

export type DelegationCallback = (task: TaskItem) => void;

class SyncRelayService {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<DelegationCallback> = new Set();
  private activeRoomId: string | null = null;
  private activeRoomKey: string | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('intodo_sync_channel');
      this.channel.onmessage = this.handleBroadcastMessage.bind(this);
    }
  }

  /**
   * Set up active delegation room for listening to incoming tasks
   */
  public joinRoom(roomId: string, roomKey: string): void {
    this.activeRoomId = roomId;
    this.activeRoomKey = roomKey;
  }

  /**
   * Register a callback when a new delegated task arrives
   */
  public onTaskReceived(callback: DelegationCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Send an encrypted task to a specific delegation room
   */
  public async sendDelegatedTask(
    roomId: string,
    roomKey: string,
    payload: DelegatedTaskPayload
  ): Promise<void> {
    const jsonStr = JSON.stringify(payload);
    const encrypted = await CryptoEngine.encrypt(jsonStr, roomKey);

    const message: SyncMessage = {
      type: 'TASK_DELEGATED',
      roomId,
      encryptedPayload: encrypted,
      timestamp: Date.now(),
    };

    // 1. Broadcast to local tabs/windows via BroadcastChannel
    if (this.channel) {
      this.channel.postMessage(message);
    }

    // 2. Also simulate network loopback for current window if room matches
    if (this.activeRoomId === roomId && this.activeRoomKey === roomKey) {
      await this.processIncomingEncrypted(encrypted, roomKey);
    }
  }

  private async handleBroadcastMessage(event: MessageEvent<SyncMessage>): Promise<void> {
    const msg = event.data;
    if (!msg || msg.type !== 'TASK_DELEGATED') return;

    if (this.activeRoomId && this.activeRoomKey && msg.roomId === this.activeRoomId) {
      await this.processIncomingEncrypted(msg.encryptedPayload, this.activeRoomKey);
    }
  }

  private async processIncomingEncrypted(
    encryptedPayload: string,
    roomKey: string
  ): Promise<void> {
    try {
      const decryptedJson = await CryptoEngine.decrypt(encryptedPayload, roomKey);
      const payload: DelegatedTaskPayload = JSON.parse(decryptedJson);

      const newTask: TaskItem = {
        id: 'del_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        title: payload.title,
        description: payload.description,
        profile: 'work', // Delegated tasks default to work profile
        status: 'pending',
        priority: payload.priority || 'medium',
        dueDate: payload.dueDate,
        tags: ['delegated', payload.senderName.toLowerCase().replace(/\s+/g, '-')],
        createdAt: Date.now(),
        delegatedBy: payload.senderName,
        delegatedNote: payload.note,
        subtasks: [],
      };

      this.listeners.forEach((listener) => listener(newTask));
    } catch (err) {
      console.warn('[SyncRelay] Failed to decrypt incoming delegation message:', err);
    }
  }
}

export const SyncRelay = new SyncRelayService();
