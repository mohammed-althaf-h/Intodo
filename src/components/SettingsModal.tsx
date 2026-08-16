import React, { useState } from 'react';
import { useVaultStore } from '../store/useVaultStore';
import { 
  X, 
  ShieldCheck, 
  Download, 
  Upload, 
  Check, 
  FileText
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { 
    exportEncryptedVault, 
    importEncryptedVault, 
    clearVaultData,
    workTasks,
    personalTasks
  } = useVaultStore();

  const [exportPassphrase, setExportPassphrase] = useState('');
  const [exportedString, setExportedString] = useState('');
  const [importPassphrase, setImportPassphrase] = useState('');
  const [importString, setImportString] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  if (!isOpen) return null;

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exportPassphrase) return;
    try {
      const backup = await exportEncryptedVault(exportPassphrase);
      setExportedString(backup);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleCopyBackup = () => {
    navigator.clipboard.writeText(exportedString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadBackupFile = () => {
    const blob = new Blob([exportedString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `intodo-backup-${new Date().toISOString().split('T')[0]}.vault`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importString.trim() || !importPassphrase) return;
    try {
      const result = await importEncryptedVault(importString.trim(), importPassphrase);
      setImportStatus(`Success! Restored ${result.workCount} Work tasks & ${result.personalCount} Personal tasks.`);
      setImportString('');
      setImportPassphrase('');
    } catch {
      setImportStatus('Decryption failed: Incorrect passphrase or corrupted backup.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-obsidian-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-obsidian-950/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Vault Security & Settings</h2>
              <p className="text-xs text-slate-400">Enterprise Compliance & Encrypted Backups</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* EDR & Enterprise Audit Status */}
          <div className="p-4 rounded-xl bg-obsidian-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider">
                EDR / XDR Compliance Audit
              </span>
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                100% CLEAN
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Zero Admin Rights Required</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>User-space execution only</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>No global DLL / keyboard hooks</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Strict TLS 1.3 over HTTPS/WSS (443)</span>
              </div>
            </div>
          </div>

          {/* Backup & Export Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Download className="w-4 h-4 text-sky-400" />
              <span>Export Encrypted Vault Backup</span>
            </div>
            <p className="text-xs text-slate-400">
              Encrypt your entire database ({workTasks.length} Work + {personalTasks.length} Personal tasks) using client-side AES-256-GCM.
            </p>

            <form onSubmit={handleExport} className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={exportPassphrase}
                  onChange={(e) => setExportPassphrase(e.target.value)}
                  placeholder="Set an encryption passphrase..."
                  className="flex-1 bg-obsidian-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
                <button
                  type="submit"
                  disabled={!exportPassphrase}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-obsidian-950 text-xs font-bold rounded-lg transition-colors"
                >
                  Generate Backup
                </button>
              </div>
            </form>

            {exportedString && (
              <div className="p-3 rounded-xl bg-obsidian-950 border border-slate-800 space-y-2 animate-slide-up">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>AES-256-GCM Encrypted Payload:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyBackup}
                      className="text-sky-400 hover:underline flex items-center gap-1 text-[11px]"
                    >
                      {copied ? <Check className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      onClick={handleDownloadBackupFile}
                      className="text-sky-400 hover:underline flex items-center gap-1 text-[11px]"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download .vault</span>
                    </button>
                  </div>
                </div>
                <textarea
                  readOnly
                  rows={3}
                  value={exportedString}
                  className="w-full bg-obsidian-900 border border-slate-800 rounded-lg p-2 text-[10px] font-mono text-slate-300 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Import Backup Section */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Restore Encrypted Backup</span>
            </div>

            <form onSubmit={handleImport} className="space-y-2">
              <textarea
                rows={2}
                value={importString}
                onChange={(e) => setImportString(e.target.value)}
                placeholder="Paste encrypted backup string here..."
                className="w-full bg-obsidian-950 border border-slate-800 rounded-lg p-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500"
              />

              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={importPassphrase}
                  onChange={(e) => setImportPassphrase(e.target.value)}
                  placeholder="Enter the decryption passphrase..."
                  className="flex-1 bg-obsidian-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={!importString || !importPassphrase}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-obsidian-950 text-xs font-bold rounded-lg transition-colors"
                >
                  Restore Vaults
                </button>
              </div>
            </form>

            {importStatus && (
              <div className={`p-2.5 rounded-lg text-xs font-medium ${
                importStatus.startsWith('Success') 
                  ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300' 
                  : 'bg-red-950/40 border border-red-500/40 text-red-300'
              }`}>
                {importStatus}
              </div>
            )}
          </div>

          {/* Danger Zone */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-red-400">Wipe Local Vaults</div>
                <div className="text-[11px] text-slate-500">Permanently clears all tasks from this device.</div>
              </div>

              {!showClearConfirm ? (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-medium rounded-lg transition-colors"
                >
                  Clear Data
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      clearVaultData();
                      setShowClearConfirm(false);
                    }}
                    className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    Confirm Wipe
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
