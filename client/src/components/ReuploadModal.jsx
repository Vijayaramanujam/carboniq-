import React, { useState, useRef } from 'react';
import { X, Upload, FileText, AlertTriangle, RefreshCw } from 'lucide-react';
import { reuploadDocumentFile } from '../services/api.js';

export function ReuploadModal({ document, isOpen, onClose, onReuploaded }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen || !document) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a replacement file to upload.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const res = await reuploadDocumentFile(document._id, file);
      if (!res.success) {
        throw new Error(res.error || 'Failed to upload replacement file.');
      }

      if (onReuploaded) onReuploaded(res.document);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#030906]/85 backdrop-blur-md">
      <div className="bg-[#0b1b14] border border-[#b4ffcd]/20 rounded-2xl w-full max-w-lg shadow-[0_24px_64px_rgba(0,0,0,0.85)] p-6 relative overflow-hidden animate-modal-enter">
        {/* Top Specular Rim */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#b5f568] to-transparent z-10 pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-[#121e1a] border border-[#b5f568]/30 text-[#b5f568]">
              <Upload className="w-5 h-5 text-[#b5f568]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-mono">Re-upload Clearer Document</h3>
              <p className="text-[11px] text-[#9aada2] font-mono">High-resolution scan replacement</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#9aada2] hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 p-3.5 rounded-xl bg-[#071610] border border-[#b4ffcd]/15 text-xs text-[#9aada2] font-mono">
          <span className="font-semibold text-amber-300 block mb-0.5">Replacing Target Document:</span>
          <span className="text-white truncate block">{document.originalFileName}</span>
        </div>

        <div className="mt-4">
          <label className="block text-[11px] font-mono uppercase tracking-wider text-[#9aada2] mb-2">
            Select high-resolution scan, meter photo, or corrected document:
          </label>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/[0.12] hover:border-[#b5f568] rounded-2xl p-6 text-center cursor-pointer bg-[#040a08]/80 hover:bg-[#06110d] transition-all duration-300 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.csv,.xlsx"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-xl bg-[#121e1a] border border-[#62dd9e]/30 flex items-center justify-center mx-auto mb-2.5 group-hover:scale-105 transition-transform">
              <FileText className="w-6 h-6 text-[#b5f568]" />
            </div>
            {file ? (
              <div>
                <p className="text-xs font-semibold text-white font-mono truncate">{file.name}</p>
                <p className="text-[10px] text-[#b5f568] font-mono mt-1">
                  {(file.size / 1024).toFixed(1)} KB &bull; Click to choose different file
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-medium text-white">Click to select replacement file</p>
                <p className="text-[10px] text-[#9aada2] font-mono mt-1">PDF, JPG, PNG, CSV, XLSX (Max 25MB)</p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs font-mono flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-6 flex items-center justify-end space-x-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#9aada2] hover:text-white border border-white/[0.08] text-xs font-mono transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={uploading || !file}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold transition shadow-md cursor-pointer ${
              uploading || !file
                ? 'bg-[#121e1a] text-slate-500 border border-white/[0.06] cursor-not-allowed'
                : 'bg-gradient-to-r from-[#b5f568] to-[#9ad84f] text-[#07130f] hover:shadow-[0_0_24px_rgba(181,245,104,0.4)] hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {uploading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-[#07130f]" />
                <span>Processing Replacement...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 text-[#07130f]" />
                <span>Upload & Reprocess</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReuploadModal;
