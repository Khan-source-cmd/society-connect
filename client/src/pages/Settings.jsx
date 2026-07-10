import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, Shield, Bell, Save, Building, Phone, MapPin, CreditCard, Globe, Upload, Image, MessageCircle, Plus, Trash2, FileText, QrCode } from 'lucide-react';
import WhatsAppSetup from '../components/WhatsAppSetup.jsx';
import Sidebar from '../components/Sidebar';
import { propertyAPI, settingsAPI } from '../services/apiService';

const FLAT_TYPES = ['1RK', '1BHK', '1.5BHK', '2BHK', '2.5BHK', '3BHK', '3.5BHK', '4BHK', 'Penthouse', 'Duplex'];

const DEFAULT_RATES = {
  '1RK': 1500, '1BHK': 2000, '1.5BHK': 2500, '2BHK': 3000, '2.5BHK': 3500,
  '3BHK': 4000, '3.5BHK': 4500, '4BHK': 5000, 'Penthouse': 7000, 'Duplex': 6000
};

const DEFAULT_BILL_BREAKDOWN = [
  { id: 1, name: 'Maintenance Charges', percentage: 70 },
  { id: 2, name: 'Sinking Fund', percentage: 15 },
  { id: 3, name: 'Water Charges', percentage: 10 },
  { id: 4, name: 'Parking', percentage: 5 }
];

const DEFAULT_SETTINGS = {
  societyName: 'SocietyConnect',
  address: '123 Society Building, Mumbai - 400001',
  phone: '+91 98765 43210',
  email: 'info@societyconnect.com',
  website: 'www.societyconnect.com',
  bankName: 'State Bank of India',
  accountNumber: '1234567890',
  ifscCode: 'SBIN0001234',
  taxId: '27AAATS1234A1Z5'
};

const Settings = () => {
  const storedRole = localStorage.getItem('userRole');
  const isAdmin = storedRole === 'admin' || storedRole === 'Admin';
  const userEmail = localStorage.getItem('userEmail') || 'admin@societyconnect.com';
  
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [whatsappNotifications, setWhatsappNotifications] = useState(false);
  const [currentRole, setCurrentRole] = useState(storedRole === 'admin' ? 'Admin' : (storedRole || 'Admin'));
  const [rates, setRates] = useState(DEFAULT_RATES);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  
  const [signatureImage, setSignatureImage] = useState(null);
  const [stampImage, setStampImage] = useState(null);
  const signatureInputRef = useRef(null);
  const stampInputRef = useRef(null);

  const [societySettings, setSocietySettings] = useState(DEFAULT_SETTINGS);
  const [billBreakdown, setBillBreakdown] = useState(DEFAULT_BILL_BREAKDOWN);

  // Fetch settings from database on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setSettingsLoading(true);
    try {
      const response = await settingsAPI.getSettings();
      if (response.success && response.data) {
        // Extract text settings
        const textSettings = { ...DEFAULT_SETTINGS };
        const loadedSettings = { ...DEFAULT_SETTINGS };
        
        // Load text settings
        Object.keys(loadedSettings).forEach(key => {
          if (response.data[key] && key !== 'signatureImage' && key !== 'stampImage') {
            loadedSettings[key] = response.data[key];
            textSettings[key] = response.data[key];
          }
        });
        
        setSocietySettings(loadedSettings);
        
      // Load images if present
        if (response.data.signatureImage) {
          setSignatureImage(response.data.signatureImage);
        }
        if (response.data.stampImage) {
          setStampImage(response.data.stampImage);
        }
        
        // Load bill breakdown from database if present
        if (response.data.billBreakdown) {
          try {
            const breakdown = typeof response.data.billBreakdown === 'string' 
              ? JSON.parse(response.data.billBreakdown) 
              : response.data.billBreakdown;
            if (Array.isArray(breakdown) && breakdown.length > 0) {
              setBillBreakdown(breakdown);
              localStorage.setItem('billBreakdown', JSON.stringify(breakdown));
            }
          } catch (e) {
            console.log('Error parsing bill breakdown from database');
          }
        }
        
        // Store in localStorage as backup (text settings only, images are too large)
        localStorage.setItem('societySettings', JSON.stringify(textSettings));
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      // Try localStorage fallback
      const saved = localStorage.getItem('societySettings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSocietySettings(parsed);
          if (parsed.signatureImage) setSignatureImage(parsed.signatureImage);
          if (parsed.stampImage) setStampImage(parsed.stampImage);
        } catch (e) {}
      }
    } finally {
      setSettingsLoading(false);
    }
    
    // Load bill breakdown from localStorage
    const savedBreakdown = localStorage.getItem('billBreakdown');
    if (savedBreakdown) {
      try {
        setBillBreakdown(JSON.parse(savedBreakdown));
      } catch (e) {
        console.log('Using default bill breakdown');
      }
    }
  };

  useEffect(() => {
    if (isAdmin) fetchRates();
  }, [isAdmin]);

  const fetchRates = async () => {
    try {
      const response = await propertyAPI.getAllRates();
      if (response.data && response.data.length > 0) {
        const ratesObj = {};
        response.data.forEach(r => { ratesObj[r.flat_type] = parseFloat(r.rate); });
        setRates({...DEFAULT_RATES, ...ratesObj});
      }
    } catch (err) { console.error('Error fetching rates:', err); }
  };

  const handleRateChange = (flatType, value) => {
    setRates({...rates, [flatType]: value});
  };

  const handleSaveRates = async () => {
    setRatesLoading(true);
    try {
      for (const [flatType, rate] of Object.entries(rates)) {
        await propertyAPI.updateFlatRate(flatType, rate);
      }
      alert('Maintenance rates saved successfully!');
    } catch (err) { alert('Failed to save rates'); }
    finally { setRatesLoading(false); }
  };

  // Bill Breakdown handlers
  const handleAddBreakdownItem = () => {
    const newId = billBreakdown.length > 0 ? Math.max(...billBreakdown.map(item => item.id)) + 1 : 1;
    setBillBreakdown([...billBreakdown, { id: newId, name: '', percentage: 0 }]);
  };

  const handleBreakdownChange = (id, field, value) => {
    setBillBreakdown(billBreakdown.map(item => 
      item.id === id ? { ...item, [field]: field === 'percentage' ? parseFloat(value) || 0 : value } : item
    ));
  };

  const handleRemoveBreakdownItem = (id) => {
    setBillBreakdown(billBreakdown.filter(item => item.id !== id));
  };

  const calculateTotalPercentage = () => {
    return billBreakdown.reduce((sum, item) => sum + (item.percentage || 0), 0);
  };

  const handleImageUpload = (event, setImage) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size should be less than 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => { setImage(reader.result); };
    reader.readAsDataURL(file);
  };

  const handleClearImage = (setImage) => { setImage(null); };

  const profile = {
    name: isAdmin ? "Admin User" : "Resident User",
    email: userEmail
  };

  const handleRoleSwitch = () => {
    const newRole = currentRole === 'Admin' ? 'Resident' : 'Admin';
    setCurrentRole(newRole);
    localStorage.setItem('userRole', newRole.toLowerCase());
    window.location.reload();
  };

  const handleSaveChanges = async () => {
    try {
      // Save to database (including images and bill breakdown)
      // Stringify billBreakdown array for database storage
      const allSettings = { 
        ...societySettings, 
        signatureImage, 
        stampImage,
        billBreakdown: JSON.stringify(billBreakdown)
      };
      const response = await settingsAPI.saveSettings(allSettings);
      
      if (response.success) {
        // Also save to localStorage as backup (text settings only)
        const textSettings = { ...societySettings };
        localStorage.setItem('societySettings', JSON.stringify(textSettings));
        localStorage.setItem('billBreakdown', JSON.stringify(billBreakdown));
        alert('Settings saved successfully!');
      } else {
        alert('Failed to save settings to database, saved locally instead');
        localStorage.setItem('societySettings', JSON.stringify(allSettings));
        localStorage.setItem('billBreakdown', JSON.stringify(billBreakdown));
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      // Save to localStorage as fallback
      const allSettings = { ...societySettings, signatureImage, stampImage };
      localStorage.setItem('societySettings', JSON.stringify(allSettings));
      localStorage.setItem('billBreakdown', JSON.stringify(billBreakdown));
      alert('Settings saved locally (offline mode)');
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1">
        <motion.div className="container mx-auto px-6 py-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-800">Settings</h1>
            <p className="text-slate-600 mt-2">Manage your account and system preferences</p>
          </div>

          <motion.div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-slate-200">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User size={32} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-800">{profile.name}</h2>
                <p className="text-slate-600">{profile.email}</p>
              </div>
            </div>
          </motion.div>

          <motion.div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield size={24} className="text-blue-600" />
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">System Role (Demo)</h3>
                  <p className="text-slate-600 text-sm">Switch between Admin and Resident</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${currentRole === 'Admin' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                  {currentRole}
                </span>
                <button onClick={handleRoleSwitch} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                  <Shield size={18} /><span>Switch</span>
                </button>
              </div>
            </div>
          </motion.div>

          <motion.div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Account Settings</h3>
            </div>
            <div className="divide-y divide-slate-200">
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center"><Bell size={20} className="text-blue-600" /></div>
                  <div><h4 className="font-medium text-slate-800">Email Notifications</h4></div>
                </div>
                <button onClick={() => setEmailNotifications(!emailNotifications)} className={`w-12 h-6 rounded-full ${emailNotifications ? 'bg-blue-600' : 'bg-slate-300'}`}>
                  <span className={`block w-5 h-5 bg-white rounded-full transform ${emailNotifications ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center"><MessageCircle size={20} className="text-green-600" /></div>
                  <div><h4 className="font-medium text-slate-800">WhatsApp Notification</h4></div>
                </div>
                <button onClick={() => setWhatsappNotifications(!whatsappNotifications)} className={`w-12 h-6 rounded-full ${whatsappNotifications ? 'bg-green-600' : 'bg-slate-300'}`}>
                  <span className={`block w-5 h-5 bg-white rounded-full transform ${whatsappNotifications ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          </motion.div>

          {isAdmin && (
            <motion.div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden mt-8">
              <div className="p-6 border-b border-slate-200 bg-blue-50">
                <h3 className="text-lg font-semibold text-slate-800">Society Configuration</h3>
              </div>
              {settingsLoading ? (
                <div className="p-6 text-center">Loading settings...</div>
              ) : (
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Society Name</label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <input type="text" value={societySettings.societyName} onChange={(e) => setSocietySettings({...societySettings, societyName: e.target.value})} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <input type="text" value={societySettings.phone} onChange={(e) => setSocietySettings({...societySettings, phone: e.target.value})} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg" />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 text-gray-400 h-5 w-5" />
                        <textarea value={societySettings.address} onChange={(e) => setSocietySettings({...societySettings, address: e.target.value})} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg" rows={2} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                      <input type="email" value={societySettings.email} onChange={(e) => setSocietySettings({...societySettings, email: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Website</label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <input type="text" value={societySettings.website} onChange={(e) => setSocietySettings({...societySettings, website: e.target.value})} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Bank Name</label>
                      <div className="relative">
                        <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <input type="text" value={societySettings.bankName} onChange={(e) => setSocietySettings({...societySettings, bankName: e.target.value})} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Account Number</label>
                      <input type="text" value={societySettings.accountNumber} onChange={(e) => setSocietySettings({...societySettings, accountNumber: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">IFSC Code</label>
                      <input type="text" value={societySettings.ifscCode} onChange={(e) => setSocietySettings({...societySettings, ifscCode: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Tax ID / GST Number</label>
                      <input type="text" value={societySettings.taxId} onChange={(e) => setSocietySettings({...societySettings, taxId: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg" />
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {isAdmin && (
            <motion.div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden mt-8">
              <div className="p-6 border-b border-slate-200 bg-purple-50">
                <h3 className="text-lg font-semibold text-slate-800">PDF Configuration</h3>
                <p className="text-slate-600 text-sm mt-1">Upload signature and stamp for receipts</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Image size={24} className="text-purple-600" />
                      <h4 className="font-semibold text-slate-800">Secretary Signature</h4>
                    </div>
                    {signatureImage ? (
                      <div className="relative">
                        <img src={signatureImage} alt="Signature" className="max-h-32 mx-auto object-contain bg-white p-2 border rounded" />
                        <button onClick={() => handleClearImage(setSignatureImage)} className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">✕</button>
                      </div>
                    ) : (
                      <div onClick={() => signatureInputRef.current?.click()} className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:bg-slate-50">
                        <Upload size={32} className="mx-auto text-slate-400 mb-2" />
                        <p className="text-slate-600 text-sm">Click to upload signature</p>
                        <p className="text-slate-400 text-xs mt-1">PNG, JPG (max 2MB)</p>
                      </div>
                    )}
                    <input ref={signatureInputRef} type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setSignatureImage)} className="hidden" />
                  </div>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Image size={24} className="text-red-600" />
                      <h4 className="font-semibold text-slate-800">Society Stamp</h4>
                    </div>
                    {stampImage ? (
                      <div className="relative">
                        <img src={stampImage} alt="Stamp" className="max-h-32 mx-auto object-contain bg-white p-2 border rounded" />
                        <button onClick={() => handleClearImage(setStampImage)} className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">✕</button>
                      </div>
                    ) : (
                      <div onClick={() => stampInputRef.current?.click()} className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:bg-slate-50">
                        <Upload size={32} className="mx-auto text-slate-400 mb-2" />
                        <p className="text-slate-600 text-sm">Click to upload stamp</p>
                        <p className="text-slate-400 text-xs mt-1">PNG, JPG (max 2MB)</p>
                      </div>
                    )}
                    <input ref={stampInputRef} type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setStampImage)} className="hidden" />
                  </div>
                </div>
                <p className="text-slate-500 text-sm mt-4">💡 These images will appear on maintenance receipts and bills.</p>
              </div>
            </motion.div>
          )}

          {isAdmin && (
            <motion.div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden mt-8">
              <div className="p-6 border-b border-slate-200 bg-green-50">
                <h3 className="text-lg font-semibold text-slate-800">Maintenance Rate Configuration</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {FLAT_TYPES.map(flatType => (
                    <div key={flatType} className="bg-slate-50 rounded-lg p-4">
                      <label className="block text-sm font-medium text-slate-700 mb-2">{flatType}</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">₹</span>
                        <input type="number" value={rates[flatType] || 0} onChange={(e) => handleRateChange(flatType, e.target.value)} className="w-full pl-7 pr-2 py-2 border border-slate-300 rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex justify-end">
                  <button onClick={handleSaveRates} disabled={ratesLoading} className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50">
                    <Save size={18} />{ratesLoading ? 'Saving...' : 'Save Rates'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {isAdmin && (
            <motion.div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden mt-8">
              <div className="p-6 border-b border-slate-200 bg-amber-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">Bill Breakdown Configuration</h3>
                    <p className="text-slate-600 text-sm mt-1">Define percentage breakdown for maintenance bills</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600">Total:</p>
                    <p className={`text-xl font-bold ${calculateTotalPercentage() === 100 ? 'text-green-600' : 'text-red-600'}`}>
                      {calculateTotalPercentage()}%
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {billBreakdown.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm text-slate-500 w-6">{index + 1}.</span>
                      <input 
                        type="text" 
                        placeholder="Description (e.g., Maintenance Charges)"
                        value={item.name}
                        onChange={(e) => handleBreakdownChange(item.id, 'name', e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                      <div className="relative w-24">
                          <input 
                            type="number" 
                            value={item.percentage ?? 0}
                            onChange={(e) => handleBreakdownChange(item.id, 'percentage', e.target.value)}
                          className="w-full pl-3 pr-8 py-2 border border-slate-300 rounded-lg text-sm"
                          placeholder="0"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 text-sm">%</span>
                      </div>
                      <button 
                        onClick={() => handleRemoveBreakdownItem(item.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
                
                <button 
                  onClick={handleAddBreakdownItem}
                  className="mt-4 flex items-center gap-2 text-amber-600 hover:bg-amber-50 px-4 py-2 rounded-lg"
                >
                  <Plus size={18} />
                  <span>Add Item</span>
                </button>
                
                <p className="text-slate-500 text-sm mt-4">
                  💡 Percentages will be calculated based on each flat's maintenance rate. Total should equal 100%.
                </p>
              </div>
            </motion.div>
          )}

          {isAdmin && (
            <motion.div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden mt-8">
              <div className="p-6 border-b border-slate-200 bg-green-50">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <QrCode size={20} className="text-green-600" />
                  WhatsApp Integration
                </h3>
                <p className="text-slate-600 text-sm mt-1">Connect WhatsApp account for automated notifications</p>
              </div>
              <div className="p-6">
                <WhatsAppSetup />
              </div>
            </motion.div>
          )}

          <div className="mt-8 text-center">
            <button onClick={handleSaveChanges} className="flex items-center gap-3 bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 mx-auto">
              <Save size={20} /><span className="font-semibold">Save Changes</span>
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Settings;
