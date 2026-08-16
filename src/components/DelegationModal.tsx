import React, { useState } from 'react';
import { useVaultStore } from '../store/useVaultStore';
import { SyncRelay } from '../services/syncRelay';
import { Priority } from '../types';
import { 
  X, 
  Copy, 
  Check, 
  Send, 
  ShieldCheck, 
  RefreshCw
} from 'lucide-react';

interface DelegationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DelegationModal: React.FC<DelegationModalProps> = ({ isOpen, onClose }) => {
  const { roomId, roomKey, generateNewRoom } = useVaultStore();

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'share' | 'simulate'>('share');

  // Simulator Form state
  const [colleagueName, setColleagueName] = useState('Sarah (Engineering Lead)');
  const [taskTitle, setTaskTitle] = useState('Review deployment logs & approve staging build');
  const [taskPriority, setTaskPriority] = useState<Priority>('high');
  const [taskNote, setTaskNote] = useState('Need this verified before our 4pm sprint call.');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  if (!isOpen) return null;

  const shareableUrl = `${window.location.origin}/#/delegate?room=${roomId}#key=${roomKey}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !colleagueName.trim()) return;

    setIsSending(true);
    try {
      await SyncRelay.sendDelegatedTask(roomId, roomKey, {
        title: taskTitle.trim(),
        senderName: colleagueName.trim(),
        priority: taskPriority,
        note: taskNote.trim() || undefined,
      });

      setSendSuccess(true);
      setTimeout(() => {
        setSendSuccess(false);
        setTaskTitle('');
        setTaskNote('');
      }, 2500);
    } catch (err) {
      console.error('Failed to send delegated task:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-obsidian-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-obsidian-950/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Collaborative Task Delegation</h2>
              <p className="text-xs text-slate-400">Zero-Knowledge Encrypted Inbound Queue</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-obsidian-950/30 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('share')}
            className={`flex-1 py-3 text-center transition-colors border-b-2 ${
              activeTab === 'share'
                ? 'border-sky-500 text-sky-400 bg-slate-800/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Share Delegation Link
          </button>
          <button
            onClick={() => setActiveTab('simulate')}
            className={`flex-1 py-3 text-center transition-colors border-b-2 ${
              activeTab === 'simulate'
                ? 'border-sky-500 text-sky-400 bg-slate-800/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Live Colleague Simulator
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          
          {activeTab === 'share' ? (
            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Give this link to your colleagues or manager. They can drop tasks into your personal/work pending inbox from any browser without needing an account or software installation.
              </p>

              {/* Shareable Box */}
              <div className="space-y-2">
                <label className="text-xs font-mono font-medium text-slate-400">
                  Your Secure Room Link
                </label>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-obsidian-950 border border-slate-800">
                  <input
                    type="text"
                    readOnly
                    value={shareableUrl}
                    className="flex-1 bg-transparent text-xs text-slate-300 font-mono focus:outline-none truncate"
                  />
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-obsidian-950 text-xs font-bold rounded-lg transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Security Details Pill */}
              <div className="p-3 rounded-xl bg-sky-950/30 border border-sky-800/40 text-xs text-sky-300 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-sky-400" />
                  <span>Enterprise Zero-Knowledge Protection</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  The encryption key is stored in the URL hash (<code className="text-sky-300 font-mono">#key=...</code>). It is decrypted client-side in your colleague's browser and <strong>never sent</strong> to any server or corporate proxy inspection system.
                </p>
              </div>

              {/* Regenerate Room */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-xs text-slate-500 font-mono">Room ID: {roomId}</span>
                <button
                  onClick={generateNewRoom}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-sky-300 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Generate New Room</span>
                </button>
              </div>
            </div>
          ) : (
            /* Colleague Task Sender Simulator */
            <form onSubmit={handleSimulateSend} className="space-y-4">
              <div className="p-2.5 rounded-lg bg-obsidian-950 border border-slate-800 text-xs text-slate-400">
                <span className="text-amber-400 font-semibold">Live Testing:</span> Submit a task here to test the E2EE WebSocket encryption roundtrip and watch it appear in your pending inbox!
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Colleague / Sender Name
                </label>
                <input
                  type="text"
                  value={colleagueName}
                  onChange={(e) => setColleagueName(e.target.value)}
                  className="w-full bg-obsidian-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Approve database migration script"
                  className="w-full bg-obsidian-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as Priority)}
                    className="w-full bg-obsidian-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Optional Note
                  </label>
                  <input
                    type="text"
                    value={taskNote}
                    onChange={(e) => setTaskNote(e.target.value)}
                    placeholder="e.g. Needs your signature"
                    className="w-full bg-obsidian-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSending}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-sky-500/25 transition-all"
              >
                {sendSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Task Encrypted & Injected into Inbox!</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{isSending ? 'Encrypting & Sending...' : 'Delegate Task to My Inbox'}</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
