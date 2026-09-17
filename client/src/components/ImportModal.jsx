import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertTriangle, AlertCircle, Loader2, Sparkles, Copy } from 'lucide-react';
import { customerService } from '../api/services.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function ImportModal({ isOpen, onClose, onSuccess }) {
  const { showToast } = useAuth();
  const [jsonInput, setJsonInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFillSample = () => {
    const sample = [
      {
        name: "Aakash Chopra",
        phone: "+91 98111-22440",
        startDate: "15/09/2026",
        planName: "Standard Veg Tiffin (Mon–Fri)",
        address: "Flat 204, Rosewood Apts"
      },
      {
        name: "Deepika Padukone",
        phone: "9811122441",
        startDate: "2026-09-10",
        planName: "Deluxe Veg Tiffin (Mon–Fri)",
        address: "Villa 12, Palm Meadows"
      },
      {
        name: "Duplicate Phone Example",
        phone: "+91 98111 22440",
        startDate: "2026-09-15",
        planName: "Standard Veg Tiffin (Mon–Fri)"
      },
      {
        name: "",
        phone: "9811122442",
        startDate: "2026-09-15",
        planName: "Standard Veg Tiffin (Mon–Fri)"
      },
      {
        name: "Invalid Date Row",
        phone: "9811122443",
        startDate: "31/02/2026",
        planName: "Standard Veg Tiffin (Mon–Fri)"
      },
      {
        name: "Short Phone Row",
        phone: "9876",
        startDate: "2026-09-15",
        planName: "Standard Veg Tiffin (Mon–Fri)"
      }
    ];
    setJsonInput(JSON.stringify(sample, null, 2));
    setResult(null);
    setError('');
  };

  const handleImport = async () => {
    setError('');
    setResult(null);

    let parsed;
    try {
      parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) {
        setError('Input JSON must be an array of customer rows.');
        return;
      }
    } catch (e) {
      setError('Invalid JSON format: ' + e.message);
      return;
    }

    try {
      setLoading(true);
      const res = await customerService.importCustomers(parsed);
      setResult(res);
      showToast(`Import completed: ${res.imported} imported, ${res.deduped} deduped, ${res.rejected?.length || 0} rejected.`, 'info');
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-warm-950/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-elevated max-w-2xl w-full border border-warm-200 overflow-hidden transform transition-all max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-warm-100 flex items-center justify-between bg-warm-50/70 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-saffron-500 to-terracotta-600 text-white flex items-center justify-center shadow-soft">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-warm-900">Bulk Customer & Subscription Import</h3>
              <p className="text-xs text-warm-500 font-medium">
                Automatic phone normalization, duplicate detection, and flexible date parsing.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-warm-400 hover:text-warm-700 p-1.5 rounded-lg hover:bg-warm-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Results Summary if import completed */}
          {result && (
            <div className="p-4 rounded-2xl bg-warm-50 border border-warm-200 space-y-3 animate-in fade-in">
              <h4 className="text-xs font-bold uppercase tracking-wider text-warm-700">Import Results</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                  <p className="text-2xl font-extrabold text-emerald-700 font-display">{result.imported}</p>
                  <p className="text-[11px] font-bold text-emerald-800 uppercase mt-0.5">Imported</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
                  <p className="text-2xl font-extrabold text-amber-700 font-display">{result.deduped}</p>
                  <p className="text-[11px] font-bold text-amber-800 uppercase mt-0.5">Deduped (Skipped)</p>
                </div>
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-center">
                  <p className="text-2xl font-extrabold text-red-700 font-display">{result.rejected?.length || 0}</p>
                  <p className="text-[11px] font-bold text-red-800 uppercase mt-0.5">Rejected</p>
                </div>
              </div>

              {result.rejected && result.rejected.length > 0 && (
                <div className="pt-2">
                  <h5 className="text-xs font-bold text-red-800 mb-1.5 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span>Rejected Rows Report ({result.rejected.length})</span>
                  </h5>
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-red-200 bg-white divide-y divide-red-100 text-xs">
                    {result.rejected.map((item, idx) => (
                      <div key={idx} className="p-2.5 space-y-0.5">
                        <div className="flex items-center justify-between font-semibold text-red-800">
                          <span>Row #{idx + 1}: {item.row?.name || '(Blank Name)'}</span>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-red-100 text-red-700 font-mono">
                            {item.reason}
                          </span>
                        </div>
                        <p className="text-[11px] text-warm-500 font-mono truncate">
                          Data: {JSON.stringify(item.row)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* JSON Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-warm-600">
                Paste Raw JSON Array of Rows
              </label>
              <button
                type="button"
                onClick={handleFillSample}
                className="inline-flex items-center gap-1 text-xs font-semibold text-saffron-700 hover:text-saffron-800 bg-saffron-50 px-2.5 py-1 rounded-lg border border-saffron-200/80 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Fill Messy Sample Data</span>
              </button>
            </div>
            <textarea
              rows={8}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder={`[\n  {\n    "name": "Customer Name",\n    "phone": "+91 98765-43210",\n    "startDate": "15/09/2026",\n    "planName": "Standard Veg Tiffin (Mon–Fri)",\n    "address": "Office 402"\n  }\n]`}
              className="w-full p-3 font-mono text-xs rounded-xl border border-warm-200 focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-200 outline-none text-warm-900 bg-warm-25"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-warm-100 flex items-center justify-end gap-3 bg-warm-50/40 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-warm-300 text-warm-700 hover:bg-warm-100 font-semibold text-xs transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            disabled={loading || !jsonInput.trim()}
            onClick={handleImport}
            className="px-5 py-2 rounded-xl bg-terracotta-600 hover:bg-terracotta-700 active:bg-terracotta-800 text-white font-semibold text-xs shadow-soft transition-all duration-200 flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing Pipeline...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>Run Import Pipeline</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
