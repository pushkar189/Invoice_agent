import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, CheckCircle2, XCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { invoicesApi } from '../services/api';
import { formatCurrency } from '../utils/format';

const STAGES = [
  'Uploading File',
  'Extracting Text',
  'AI Analysis',
  'Saving to Database',
  'Complete',
];

const UploadInvoice = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(-1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [polling, setPolling] = useState(false);

  const handleFile = (f) => {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    const allowedExt = ['.pdf', '.png', '.jpg', '.jpeg'];
    const ext = f.name.split('.').pop().toLowerCase();
    if (!allowed.includes(f.type) && !allowedExt.includes('.' + ext)) {
      setError('Unsupported file type. Please upload PDF, PNG, or JPG.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10MB.');
      return;
    }
    setFile(f);
    setError('');
    setResult(null);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const simulateStages = () => {
    let s = 0;
    const interval = setInterval(() => {
      if (s < STAGES.length - 2) {
        setStage(s++);
      } else {
        clearInterval(interval);
      }
    }, 3000);
    return interval;
  };

  const pollInvoiceStatus = async (invoiceId) => {
    setPolling(true);
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts += 1;
      try {
        const res = await invoicesApi.get(invoiceId);
        const invoice = res.data.data;

        if (invoice.extraction_status === 'COMPLETED' || invoice.extraction_status === 'FAILED') {
          clearInterval(interval);
          setResult(invoice);
          setStage(STAGES.length - 1);
          setUploading(false);
          setPolling(false);
          // Show error message if extraction failed
          if (invoice.extraction_status === 'FAILED') {
            setError('AI extraction failed. The image may be too low resolution or blurry. Please try a clearer image or PDF.');
          }
          return;
        }
      } catch (pollErr) {
        clearInterval(interval);
        setPolling(false);
        setUploading(false);
        setError('Unable to fetch invoice status. Please try again later.');
      }

      if (attempts >= 60) { // 3 minutes max
        clearInterval(interval);
        setPolling(false);
        setUploading(false);
        setError('Processing is taking longer than expected. Please check the Invoices list in a few minutes.');
      }
    }, 3000);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    setStage(0);
    setProgress(0);

    const stageInterval = simulateStages();

    const formData = new FormData();
    formData.append('invoice', file);

    try {
      const res = await invoicesApi.upload(formData, (evt) => {
        if (evt.lengthComputable) {
          setProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      });
      clearInterval(stageInterval);
      setStage(STAGES.length - 2);
      const invoiceId = res.data.data?.invoiceId;
      setResult({ invoiceId, extraction_status: 'PROCESSING' });
      if (invoiceId) {
        pollInvoiceStatus(invoiceId);
      } else {
        setError('Upload succeeded but no invoice ID was returned.');
        setUploading(false);
      }
    } catch (err) {
      clearInterval(stageInterval);
      setStage(-1);
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
      setUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError('');
    setStage(-1);
    setProgress(0);
  };

  return (
    <Layout title="Upload Invoice" subtitle="Process invoices with AI extraction">
      <div className="max-w-2xl mx-auto">
        {!result ? (
          <>
            {/* Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-300 mb-6 animate-slide-up
                ${dragOver ? 'border-primary-500 bg-primary-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'}
                ${uploading ? 'pointer-events-none opacity-60' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !uploading && document.getElementById('file-input').click()}
            >
              <input id="file-input" type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden"
                onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />

              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center animate-float">
                <Upload size={28} className={dragOver ? 'text-primary-600' : 'text-slate-400'} />
              </div>
              <h3 className="text-base font-semibold text-slate-800 mb-1">
                {dragOver ? 'Drop your invoice here' : 'Drop invoice or click to browse'}
              </h3>
              <p className="text-sm text-slate-500">PDF, PNG, JPG · Max 10MB</p>
            </div>

            {/* Selected File */}
            {file && (
              <div className="card p-4 mb-4 flex items-center gap-4 animate-slide-up">
                <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                  <FileText size={18} className="text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB • {file.type}</p>
                </div>
                {!uploading && (
                  <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-slate-500 hover:text-red-400 text-lg leading-none">×</button>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 mb-4 animate-fade-in">
                <XCircle size={16} /> {error}
              </div>
            )}

            {/* Processing Stages */}
            {uploading && (
              <div className="card p-5 mb-4 animate-fade-in">
                <h4 className="text-sm font-semibold text-slate-800 mb-4">Processing Invoice...</h4>
                <div className="space-y-2">
                  {STAGES.map((s, i) => (
                    <div key={s} className={`flex items-center gap-3 text-sm transition-all duration-300
                      ${i < stage ? 'text-emerald-600' : i === stage ? 'text-primary-600' : 'text-slate-400'}`}>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0
                        ${i < stage ? 'bg-emerald-100' : i === stage ? 'bg-primary-100 animate-pulse' : 'bg-slate-100'}`}>
                        {i < stage ? '✓' : i === stage ? '⟳' : i + 1}
                      </div>
                      {s}
                    </div>
                  ))}
                </div>
                {progress > 0 && progress < 100 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Upload progress</span><span>{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-600 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                id="upload-btn" onClick={handleUpload} disabled={!file || uploading}
                className="btn-primary flex-1 justify-center py-3">
                {uploading ? '⟳ Processing with AI...' : '⚡ Upload & Process Invoice'}
              </button>
              {file && !uploading && (
                <button onClick={reset} className="btn-secondary">Reset</button>
              )}
            </div>

            {/* Info */}
            <div className="mt-6 p-4 bg-primary-50 border border-primary-200 rounded-xl animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <h4 className="text-xs font-semibold text-primary-700 mb-2">What happens when you upload?</h4>
              <ul className="text-xs text-slate-500 space-y-1">
                <li>→ Text is extracted from PDF or OCR'd from images</li>
                <li>→ Gemma AI analyzes and extracts structured data</li>
                <li>→ Anomalies are detected</li>
                <li>→ Invoice is saved to the database</li>
              </ul>
            </div>
          </>
        ) : (
                  /* Result Card */
          <div className="space-y-4 animate-slide-up">
            <div className={`card p-6 text-center ${result.extraction_status === 'FAILED' ? 'border-red-200 bg-red-50' : ''}`}>
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center animate-float
                ${result.extraction_status === 'FAILED' ? 'bg-red-100' : 'bg-emerald-50'}`}>
                {result.extraction_status === 'FAILED'
                  ? <XCircle size={32} className="text-red-500" />
                  : <CheckCircle2 size={32} className="text-emerald-600" />}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-1">
                {result.extraction_status === 'FAILED'
                  ? 'Extraction Failed'
                  : result.invoice_number ? 'Invoice Processed!' : 'Upload Received!'}
              </h3>
              <p className="text-sm text-slate-500">
                {result.extraction_status === 'FAILED'
                  ? 'The image quality was too low for OCR or AI extraction. Please upload a clearer, higher-resolution image or a text-based PDF.'
                  : result.invoice_number
                    ? `AI extraction complete with ${Math.round((result.extraction?.confidence_score || 0) * 100)}% confidence`
                    : 'Invoice uploaded. AI is processing in the background.'}
              </p>
            </div>

            <div className="card p-5 space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-500 text-sm">Invoice ID</span>
                <span className="text-slate-900 font-mono text-xs">{result.id || result.invoiceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-sm">Extraction Status</span>
                <span className={`text-sm font-semibold px-2 py-0.5 rounded-full
                  ${result.extraction_status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700'
                  : result.extraction_status === 'FAILED' ? 'bg-red-100 text-red-700'
                  : 'bg-amber-100 text-amber-700'}`}>
                  {result.extraction_status}
                </span>
              </div>
              {result.extraction_status === 'COMPLETED' && (
                <>
                  <div className="flex justify-between"><span className="text-slate-500 text-sm">Invoice #</span><span className="text-slate-900 font-medium">{result.invoice_number || 'Not detected'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 text-sm">Vendor</span><span className="text-slate-900">{result.vendor_name || 'Not detected'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 text-sm">Total Amount</span><span className="text-slate-900 font-semibold">{formatCurrency(result.total)}</span></div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-sm">Status</span>
                    <span className={`text-sm font-medium ${result.status === 'REVIEW' ? 'text-purple-600' : 'text-emerald-600'}`}>{result.status}</span>
                  </div>
                </>
              )}
              {result.extraction_status === 'FAILED' && (
                <div className="text-xs text-red-600 bg-red-50 rounded-lg p-3 mt-1">
                  <strong>Tips for better results:</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Use a PDF instead of an image for best accuracy</li>
                    <li>If using an image, ensure it is at least 300 DPI</li>
                    <li>Make sure the invoice is not blurry or rotated</li>
                    <li>Avoid screenshots of low-resolution invoices</li>
                  </ul>
                </div>
              )}
            </div>

            {result.flags?.length > 0 && (
              <div className="card p-4">
                <h4 className="text-sm font-semibold text-amber-600 flex items-center gap-2 mb-3">
                  <AlertTriangle size={14} /> {result.flags.length} Flag(s) Detected
                </h4>
                {result.flags.map((f, i) => (
                  <div key={i} className="text-xs text-slate-600 flex items-start gap-2 mb-1">
                    <span className="text-amber-500">⚑</span> [{f.type}] {f.message}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              {result.extraction_status !== 'FAILED' && (
                <button onClick={() => navigate(`/invoices/${result.id || result.invoiceId}`)} className="btn-primary flex-1 justify-center">
                  View Invoice <ArrowRight size={14} />
                </button>
              )}
              <button onClick={reset} className={`btn-secondary ${result.extraction_status === 'FAILED' ? 'flex-1 justify-center' : ''}`}>Upload Another</button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default UploadInvoice;
