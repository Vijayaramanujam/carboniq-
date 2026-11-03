import React, { useState } from 'react';
import { PlusCircle, CheckCircle, AlertTriangle, RefreshCw, Calendar, Tag, ShieldCheck, Sparkles } from 'lucide-react';
import { createManualActivity } from '../services/api.js';

export function ManualEntryModal({ onActivityCreated }) {
  const [category, setCategory] = useState('ELECTRICITY');
  const [scope, setScope] = useState('SCOPE_2');
  const [activityDate, setActivityDate] = useState(new Date().toISOString().split('T')[0]);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kWh');
  const [supplierName, setSupplierName] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  // Category specific fields
  const [fuelType, setFuelType] = useState('Diesel');
  const [transportMode, setTransportMode] = useState('Road / Truck');
  const [wasteType, setWasteType] = useState('');
  const [disposalMethod, setDisposalMethod] = useState('Landfill');

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [successMessage, setSuccessMessage] = useState(null);

  const handleCategorySelect = (newCat) => {
    setCategory(newCat);
    setValidationErrors([]);
    setErrorMessage(null);
    switch (newCat) {
      case 'ELECTRICITY':
        setUnit('kWh');
        setScope('SCOPE_2');
        break;
      case 'FUEL':
        setUnit('Liters');
        setScope('SCOPE_1');
        break;
      case 'TRANSPORTATION':
        setUnit('km');
        setScope('SCOPE_3');
        break;
      case 'WASTE':
        setUnit('kg');
        setScope('SCOPE_3');
        break;
      case 'SUPPLIER_INVOICE':
        setUnit('INR');
        setScope('SCOPE_3');
        break;
      default:
        break;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setValidationErrors([]);
    setSuccessMessage(null);

    const payload = {
      category,
      scope,
      activityDate,
      quantity: Number(quantity),
      unit: unit.trim(),
      supplierName: supplierName.trim() || undefined,
      description: description.trim() || undefined,
      internalNotes: notes.trim() || undefined,
      categoryData: {},
    };

    if (category === 'FUEL') {
      payload.categoryData.fuelType = fuelType;
    } else if (category === 'TRANSPORTATION') {
      payload.categoryData.transportMode = transportMode;
    } else if (category === 'WASTE') {
      payload.categoryData.wasteType = wasteType;
      payload.categoryData.disposalMethod = disposalMethod;
    }

    try {
      const res = await createManualActivity(payload);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to save activity record');
        if (res.details) {
          setValidationErrors(res.details);
        }
        return;
      }

      setSuccessMessage('Activity record stored in ledger successfully!');
      setQuantity('');
      setDescription('');
      setNotes('');
      setWasteType('');

      if (onActivityCreated) {
        setTimeout(() => {
          onActivityCreated(res.activity);
        }, 800);
      }
    } catch (err) {
      setErrorMessage(err.message || 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="telemetry-card p-6 sm:p-8 rounded-2xl border border-[#b4ffcd]/18 bg-[#0b1b14]/90 backdrop-blur-2xl shadow-2xl max-w-4xl mx-auto relative overflow-hidden">
      {/* Top Specular Rim */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#b5f568]/40 to-transparent" />

      <div className="flex items-center space-x-3.5 pb-4 border-b border-white/[0.08] mb-6">
        <div className="p-3 rounded-2xl bg-[#121e1a] border border-[#62dd9e]/30 text-[#62dd9e] shadow-sm">
          <PlusCircle className="w-5 h-5 text-[#b5f568]" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Direct Carbon Activity Entry</h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#121e1a] text-[#b5f568] border border-[#b5f568]/30 font-semibold">
              Manual Calibration
            </span>
          </div>
          <p className="text-xs text-[#9aada2] mt-0.5">
            Log verified operational carbon activities directly into the corporate ledger without requiring OCR parsing.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="mb-5 p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center space-x-2.5 backdrop-blur-xl animate-fade-in">
          <CheckCircle className="w-4 h-4 text-[#62dd9e] shrink-0" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-5 p-4 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs backdrop-blur-xl animate-fade-in">
          <div className="font-semibold text-red-300">{errorMessage}</div>
          {validationErrors.length > 0 && (
            <ul className="list-disc list-inside mt-1.5 space-y-0.5 text-red-200/90 font-mono">
              {validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Category & Scope */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-mono font-medium text-[#d8e6de] mb-2">
              Operational Category <span className="text-[#b5f568]">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: 'ELECTRICITY', label: 'Electricity' },
                { id: 'FUEL', label: 'Fuel' },
                { id: 'TRANSPORTATION', label: 'Transport' },
                { id: 'WASTE', label: 'Waste' },
                { id: 'SUPPLIER_INVOICE', label: 'Invoices' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategorySelect(cat.id)}
                  className={`py-2 px-2.5 rounded-full text-xs font-mono font-semibold border transition text-center cursor-pointer ${
                    category === cat.id
                      ? 'bg-[#121e1a] border-[#b5f568] text-[#b5f568] shadow-[0_0_12px_rgba(181,245,104,0.25)]'
                      : 'bg-[#040a08]/80 border-white/[0.08] text-[#9aada2] hover:text-white hover:border-white/20'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-[#d8e6de] mb-2">
              GHG Protocol Scope <span className="text-[#b5f568]">*</span>
            </label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="w-full px-4 py-2 rounded-full bg-[#040a08]/90 border border-white/[0.12] text-xs text-[#b5f568] font-semibold focus:outline-none focus:border-[#b5f568] font-mono cursor-pointer transition"
            >
              <option value="SCOPE_1" className="bg-[#0b1b14]">Scope 1 (Direct Fuel / Fleet)</option>
              <option value="SCOPE_2" className="bg-[#0b1b14]">Scope 2 (Electricity / Steam)</option>
              <option value="SCOPE_3" className="bg-[#0b1b14]">Scope 3 (Supply Chain / Waste)</option>
            </select>
          </div>
        </div>

        {/* Date, Quantity, Unit */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-mono font-medium text-[#d8e6de] mb-1">
              Activity Date <span className="text-[#b5f568]">*</span>
            </label>
            <input
              type="date"
              required
              value={activityDate}
              onChange={(e) => setActivityDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-full bg-[#040a08]/90 border border-white/[0.12] text-xs text-white focus:outline-none focus:border-[#b5f568] font-mono transition"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-[#d8e6de] mb-1">
              Numeric Quantity <span className="text-[#b5f568]">*</span>
            </label>
            <input
              type="number"
              step="any"
              required
              placeholder="e.g. 520"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-4 py-2.5 rounded-full bg-[#040a08]/90 border border-white/[0.12] text-xs text-white placeholder-[#9aada2]/40 focus:outline-none focus:border-[#b5f568] font-mono transition"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-[#d8e6de] mb-1">
              Measurement Unit <span className="text-[#b5f568]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="kWh, Liters, km, kg"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-4 py-2.5 rounded-full bg-[#040a08]/90 border border-white/[0.12] text-xs text-white placeholder-[#9aada2]/40 focus:outline-none focus:border-[#b5f568] font-mono transition"
            />
          </div>
        </div>

        {/* Category Specific Config */}
        {category === 'FUEL' && (
          <div>
            <label className="block text-xs font-mono font-medium text-[#d8e6de] mb-1">
              Fuel Type <span className="text-[#b5f568]">*</span>
            </label>
            <select
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value)}
              className="w-full px-4 py-2.5 rounded-full bg-[#040a08]/90 border border-white/[0.12] text-xs text-white focus:outline-none focus:border-[#b5f568] transition cursor-pointer"
            >
              <option value="Diesel" className="bg-[#0b1b14]">Diesel (High Speed Diesel HSD)</option>
              <option value="Petrol / Gasoline" className="bg-[#0b1b14]">Petrol / Gasoline</option>
              <option value="Natural Gas (CNG)" className="bg-[#0b1b14]">Natural Gas (CNG)</option>
              <option value="LPG" className="bg-[#0b1b14]">LPG (Liquefied Petroleum Gas)</option>
              <option value="Heavy Fuel Oil" className="bg-[#0b1b14]">Heavy Fuel Oil</option>
            </select>
          </div>
        )}

        {category === 'TRANSPORTATION' && (
          <div>
            <label className="block text-xs font-mono font-medium text-[#d8e6de] mb-1">
              Transportation Mode <span className="text-[#b5f568]">*</span>
            </label>
            <select
              value={transportMode}
              onChange={(e) => setTransportMode(e.target.value)}
              className="w-full px-4 py-2.5 rounded-full bg-[#040a08]/90 border border-white/[0.12] text-xs text-white focus:outline-none focus:border-[#b5f568] transition cursor-pointer"
            >
              <option value="Road / Truck" className="bg-[#0b1b14]">Road / Truck Logistics</option>
              <option value="Air Freight" className="bg-[#0b1b14]">Air Freight</option>
              <option value="Sea Freight" className="bg-[#0b1b14]">Sea / Maritime Container</option>
              <option value="Rail" className="bg-[#0b1b14]">Rail Cargo</option>
            </select>
          </div>
        )}

        {category === 'WASTE' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-medium text-[#d8e6de] mb-1">
                Waste Type <span className="text-[#b5f568]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Organic, Scrap Metal, Cardboard"
                value={wasteType}
                onChange={(e) => setWasteType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-full bg-[#040a08]/90 border border-white/[0.12] text-xs text-white placeholder-[#9aada2]/40 focus:outline-none focus:border-[#b5f568] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-mono font-medium text-[#d8e6de] mb-1">Disposal Method</label>
              <select
                value={disposalMethod}
                onChange={(e) => setDisposalMethod(e.target.value)}
                className="w-full px-4 py-2.5 rounded-full bg-[#040a08]/90 border border-white/[0.12] text-xs text-white focus:outline-none focus:border-[#b5f568] transition cursor-pointer"
              >
                <option value="Landfill" className="bg-[#0b1b14]">Landfill</option>
                <option value="Recycled" className="bg-[#0b1b14]">Recycled / Reclaimed</option>
                <option value="Incineration" className="bg-[#0b1b14]">Incineration</option>
                <option value="Composted" className="bg-[#0b1b14]">Composted</option>
              </select>
            </div>
          </div>
        )}

        {/* Supplier & Description */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono font-medium text-[#d8e6de] mb-1">
              Supplier / Contractor Name {category === 'SUPPLIER_INVOICE' && <span className="text-[#b5f568]">*</span>}
            </label>
            <input
              type="text"
              placeholder="e.g. National Discom / Shell"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-full bg-[#040a08]/90 border border-white/[0.12] text-xs text-white placeholder-[#9aada2]/40 focus:outline-none focus:border-[#b5f568] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-[#d8e6de] mb-1">Brief Description</label>
            <input
              type="text"
              placeholder="e.g. Facility HVAC power consumption"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-full bg-[#040a08]/90 border border-white/[0.12] text-xs text-white placeholder-[#9aada2]/40 focus:outline-none focus:border-[#b5f568] transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono font-medium text-[#d8e6de] mb-1">Internal Audit Notes</label>
          <textarea
            rows={2}
            placeholder="Audit notes or handwritten sheet reference..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-[#040a08]/90 border border-white/[0.12] text-xs text-white placeholder-[#9aada2]/40 focus:outline-none focus:border-[#b5f568] transition"
          />
        </div>

        <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
          <div className="text-[11px] font-mono text-[#9aada2] flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-[#62dd9e]" />
            <span>Persisted as sovereign audit record in Activity Ledger</span>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#b5f568] via-[#85e656] to-[#62dd9e] text-[#07130f] text-xs font-extrabold shadow-[0_0_24px_rgba(181,245,104,0.35)] hover:shadow-[0_0_36px_rgba(181,245,104,0.55)] hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving to Ledger...</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                <span>Save Activity Record</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ManualEntryModal;
