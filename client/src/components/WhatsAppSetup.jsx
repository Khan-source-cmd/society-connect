import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, RefreshCw, QrCode } from 'lucide-react';
import { useToast } from './Toast.jsx';
import { QRCodeSVG } from 'qrcode.react';

const WhatsAppSetup = () => {
  const { showToast, ToastComponent } = useToast();
  const [status, setStatus] = useState('loading');
  const [qrCode, setQrCode] = useState(null);
  const [connectionInfo, setConnectionInfo] = useState(null);
  const [eventSource, setEventSource] = useState(null);

  useEffect(() => {
    checkStatus();
    startQrStream();
    
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  const getApiUrl = () => import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const checkStatus = async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/whatsapp/status`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setStatus(data.data.connected ? 'connected' : 'disconnected');
        setConnectionInfo(data.data);
      }
    } catch (error) {
      console.error('Failed to check WhatsApp status');
    }
  };

  const startQrStream = () => {
    const es = new EventSource(`${getApiUrl()}/api/whatsapp/qr-stream`);
    
    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'qr') {
        setQrCode(data.qr);
        setStatus('waiting_qr');
      }
      
      if (data.type === 'connected') {
        setStatus('connected');
        setQrCode(null);
        showToast('WhatsApp connected successfully!', 'success');
        checkStatus();
      }
      
      if (data.type === 'disconnected') {
        setStatus('disconnected');
        setQrCode(null);
      }
    };

    es.onerror = (error) => {
      console.error('QR stream error:', error);
      es.close();
    };

    setEventSource(es);
  };

  const reconnectWhatsApp = async () => {
    try {
      await fetch(`${getApiUrl()}/api/whatsapp/reconnect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      showToast('WhatsApp reconnection initiated', 'info');
      checkStatus();
    } catch (error) {
      showToast('Failed to reconnect WhatsApp', 'error');
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      {ToastComponent}
      
      <div className="bg-green-600 text-white p-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <QrCode className="w-6 h-6" />
          WhatsApp Setup
        </h2>
      </div>

      <div className="p-6">
        {/* Connection Status */}
        <div className={`p-4 rounded-lg mb-6 ${
          status === 'connected' ? 'bg-green-50 border border-green-200' : 
          status === 'waiting_qr' ? 'bg-blue-50 border border-blue-200' :
          'bg-yellow-50 border border-yellow-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {status === 'connected' && <CheckCircle className="w-8 h-8 text-green-500" />}
              {status === 'waiting_qr' && <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />}
              {status === 'disconnected' && <AlertCircle className="w-8 h-8 text-yellow-500" />}
              
              <div>
                <p className="font-semibold text-lg">
                  {status === 'connected' ? '✅ WhatsApp Connected' :
                   status === 'waiting_qr' ? '⏳ Waiting for QR Scan' :
                   '⚠️ WhatsApp Disconnected'}
                </p>
                {connectionInfo?.phone && (
                  <p className="text-sm text-slate-600">
                    Connected as: {connectionInfo.phone}
                  </p>
                )}
              </div>
            </div>

            {status !== 'waiting_qr' && (
              <button
                onClick={reconnectWhatsApp}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {status === 'connected' ? 'Reconnect' : 'Connect'}
              </button>
            )}
          </div>
        </div>

        {/* QR Code Display */}
        {status === 'waiting_qr' && qrCode && (
          <div className="text-center">
            <p className="text-slate-600 mb-4">
              Open WhatsApp on your phone → Go to Settings → Linked Devices → Scan this QR code
            </p>
            <div className="border-2 border-slate-200 rounded-lg p-4 inline-block bg-white">
              <QRCodeSVG value={qrCode} size={256} level="M" />
            </div>
            <p className="text-sm text-slate-500 mt-4">
              QR code will refresh automatically
            </p>
          </div>
        )}

        {/* Instructions */}
        {status === 'disconnected' && (
          <div className="bg-slate-50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Instructions:</h3>
            <ol className="text-sm text-slate-600 space-y-2 list-decimal ml-4">
              <li>Click Connect button above</li>
              <li>Wait for QR code to appear</li>
              <li>Open WhatsApp on your phone</li>
              <li>Go to Settings → Linked Devices</li>
              <li>Scan the QR code with your phone camera</li>
              <li>WhatsApp will be connected permanently</li>
            </ol>
          </div>
        )}

        {/* Info Note */}
        <div className="mt-6 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
          💡 Note: You only need to scan this ONCE. The connection will survive server restarts and will work automatically.
        </div>
      </div>
    </div>
  );
};

export default WhatsAppSetup;