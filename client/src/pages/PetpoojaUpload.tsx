import { useState, useRef } from "react";

type UploadState = "pin" | "upload" | "success" | "error";

const OUTLETS = [
  { id: "palladium-instore", label: "Palladium Instore", emoji: "🏬" },
  { id: "palladium-delivery", label: "Palladium Delivery", emoji: "🛵" },
  { id: "tnagar-delivery", label: "T.Nagar Delivery", emoji: "🛵" },
];

export default function PetpoojaUpload() {
  const [state, setState] = useState<UploadState>("pin");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [selectedOutlet, setSelectedOutlet] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => {
    // Default to today's date in YYYY-MM-DD format
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePinSubmit = async () => {
    if (pin.length < 4) {
      setPinError("Enter your 4-digit PIN");
      return;
    }
    setPinError("");
    try {
      const res = await fetch("/api/petpooja/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        setState("upload");
      } else {
        setPinError("Incorrect PIN");
      }
    } catch {
      setPinError("Connection error. Try again.");
    }
  };

  const handleUpload = async () => {
    if (!selectedOutlet) {
      setErrorMsg("Select an outlet");
      return;
    }
    if (!file) {
      setErrorMsg("Select a file");
      return;
    }
    if (!selectedDate) {
      setErrorMsg("Select a date");
      return;
    }

    setErrorMsg("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("pin", pin);
      formData.append("outlet", selectedOutlet);
      formData.append("date", selectedDate);

      const res = await fetch("/api/petpooja/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setResult(data);
        setState("success");
      } else {
        setErrorMsg(data.error || "Upload failed");
        setState("error");
      }
    } catch {
      setErrorMsg("Connection error. Try again.");
      setState("error");
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedOutlet("");
    setFile(null);
    setResult(null);
    setErrorMsg("");
    setState("upload");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // PIN entry screen
  if (state === "pin") {
    return (
      <div className="min-h-screen bg-[#f5f0eb] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-4xl mb-3">🔐</div>
          <h1 className="text-xl font-bold text-[#3d2c24] mb-2">Petpooja Upload</h1>
          <p className="text-sm text-[#6b5b50] mb-6">Enter PIN to continue</p>
          
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
            placeholder="• • • •"
            className="w-full text-center text-2xl tracking-[0.5em] border-2 border-[#d2b48c] rounded-xl p-4 mb-4 focus:outline-none focus:border-[#bd302c] transition-colors"
            autoFocus
          />
          
          {pinError && (
            <p className="text-[#9e0b0f] text-sm mb-4">{pinError}</p>
          )}
          
          <button
            onClick={handlePinSubmit}
            className="w-full bg-[#bd302c] text-white font-semibold py-4 rounded-xl text-lg active:scale-95 transition-transform"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // Success screen
  if (state === "success" && result) {
    return (
      <div className="min-h-screen bg-[#f5f0eb] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-[#3d2c24] mb-2">Upload Successful!</h1>
          
          <div className="bg-[#f0f9f0] rounded-xl p-4 mb-6 text-left">
            <div className="flex justify-between py-1">
              <span className="text-[#6b5b50]">Outlet</span>
              <span className="font-medium text-[#3d2c24]">{result.outlet}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#6b5b50]">Date</span>
              <span className="font-medium text-[#3d2c24]">{result.date}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#6b5b50]">Items</span>
              <span className="font-medium text-[#3d2c24]">{result.itemCount} items</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#6b5b50]">Total Qty</span>
              <span className="font-medium text-[#3d2c24]">{result.totalQuantity}</span>
            </div>
            <div className="flex justify-between py-1 border-t border-[#e0d8d0] mt-1 pt-2">
              <span className="text-[#6b5b50] font-medium">Total Amount</span>
              <span className="font-bold text-[#3d2c24]">₹{result.totalAmount.toLocaleString()}</span>
            </div>
            {result.updated && (
              <p className="text-xs text-[#a85348] mt-2">⚠️ Previous upload for this date was replaced</p>
            )}
          </div>
          
          <button
            onClick={handleReset}
            className="w-full bg-[#bd302c] text-white font-semibold py-4 rounded-xl text-lg active:scale-95 transition-transform"
          >
            Upload Another
          </button>
        </div>
      </div>
    );
  }

  // Error screen
  if (state === "error") {
    return (
      <div className="min-h-screen bg-[#f5f0eb] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-[#3d2c24] mb-2">Upload Failed</h1>
          <p className="text-[#9e0b0f] mb-6">{errorMsg}</p>
          
          <button
            onClick={handleReset}
            className="w-full bg-[#bd302c] text-white font-semibold py-4 rounded-xl text-lg active:scale-95 transition-transform"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Upload screen
  return (
    <div className="min-h-screen bg-[#f5f0eb] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6">
        <h1 className="text-xl font-bold text-[#3d2c24] text-center mb-1">Petpooja Upload</h1>
        <p className="text-sm text-[#6b5b50] text-center mb-6">Select outlet, date, and file</p>
        
        {/* Outlet Selection */}
        <div className="mb-5">
          <label className="text-sm font-medium text-[#3d2c24] mb-2 block">Outlet</label>
          <div className="grid gap-2">
            {OUTLETS.map((outlet) => (
              <button
                key={outlet.id}
                onClick={() => setSelectedOutlet(outlet.id)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all active:scale-[0.98] ${
                  selectedOutlet === outlet.id
                    ? "border-[#bd302c] bg-[#fef2f2]"
                    : "border-[#e0d8d0] bg-white"
                }`}
              >
                <span className="text-lg mr-2">{outlet.emoji}</span>
                <span className={`font-medium ${selectedOutlet === outlet.id ? "text-[#bd302c]" : "text-[#3d2c24]"}`}>
                  {outlet.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Date Selection */}
        <div className="mb-5">
          <label className="text-sm font-medium text-[#3d2c24] mb-2 block">Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full border-2 border-[#e0d8d0] rounded-xl px-4 py-3 text-[#3d2c24] focus:outline-none focus:border-[#bd302c] transition-colors"
          />
        </div>

        {/* File Selection */}
        <div className="mb-6">
          <label className="text-sm font-medium text-[#3d2c24] mb-2 block">Item Wise Sales Report (.xlsx)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-[#6b5b50] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#f0e4de] file:text-[#5c3d38] file:font-medium file:cursor-pointer"
          />
          {file && (
            <p className="text-xs text-[#6b5b50] mt-2 truncate">📄 {file.name}</p>
          )}
        </div>

        {/* Error message */}
        {errorMsg && (
          <p className="text-[#9e0b0f] text-sm text-center mb-4">{errorMsg}</p>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full bg-[#bd302c] text-white font-semibold py-4 rounded-xl text-lg active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100"
        >
          {uploading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </span>
          ) : (
            "Upload"
          )}
        </button>
      </div>
    </div>
  );
}
