import React, { useState, useEffect } from 'react';

const PhotoUploadWithMetadata = ({ entityId, entityType = 'complaint', stage, onUpload }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [location, setLocation] = useState(null);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => {}
    );
  }, []);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (f) { setFile(f); setPreview(URL.createObjectURL(f)); }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('metadata', JSON.stringify({
        latitude: location?.latitude, longitude: location?.longitude,
        timestamp: new Date().toISOString(), description
      }));
      const endpoint = entityType === 'work-order'
        ? `/api/work-orders/${entityId}/photos/${stage}`
        : `/api/complaints/${entityId}/attachments`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) { onUpload?.(data.data); setFile(null); setPreview(null); setDescription(''); }
    } finally { setUploading(false); }
  };

  return (
    <div className="space-y-3 p-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-slate-700 flex items-center gap-2">
          📷 Photo{stage && <span className="text-xs text-slate-500 capitalize">({stage})</span>}
        </h4>
        {location && <span className="text-xs text-green-600 flex items-center gap-1">📍 GPS captured</span>}
      </div>
      {preview ? (
        <div className="relative">
          <img src={preview} alt="Preview" className="w-full h-40 object-cover rounded-lg"/>
          <button onClick={() => { setFile(null); setPreview(null); }}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1">✕</button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center h-32 cursor-pointer hover:bg-slate-100 rounded-lg">
          <span className="text-2xl text-slate-400 mb-2">📁</span>
          <span className="text-sm text-slate-500">Click to select photo</span>
          <input type="file" accept="image/*" onChange={handleFile} className="hidden"/>
        </label>
      )}
      {file && (
        <>
          <input value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Describe what this shows..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"/>
          <button onClick={handleUpload} disabled={uploading}
            className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {uploading ? 'Uploading...' : 'Upload Photo'}
          </button>
        </>
      )}
    </div>
  );
};

export default PhotoUploadWithMetadata;