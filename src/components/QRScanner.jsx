import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, RefreshCw, SwitchCamera } from 'lucide-react';

export default function QRScanner({ onScan, onClose }) {
    const [error, setError] = useState(null);
    const [isStarting, setIsStarting] = useState(true);
    const [cameras, setCameras] = useState([]);
    const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
    const scannerRef = useRef(null);

    const startScanner = async (cameraIndex = 0) => {
        setIsStarting(true);
        setError(null);

        try {
            // Get available cameras
            const devices = await Html5Qrcode.getCameras();
            setCameras(devices);

            if (devices.length === 0) {
                setError('ไม่พบกล้อง');
                setIsStarting(false);
                return;
            }

            // Prefer back camera
            let camIndex = cameraIndex;
            if (cameraIndex === 0 && devices.length > 1) {
                const backCamIndex = devices.findIndex(d =>
                    d.label.toLowerCase().includes('back') ||
                    d.label.toLowerCase().includes('rear') ||
                    d.label.toLowerCase().includes('environment')
                );
                if (backCamIndex !== -1) {
                    camIndex = backCamIndex;
                }
            }
            setCurrentCameraIndex(camIndex);

            // Initialize scanner
            if (!scannerRef.current) {
                scannerRef.current = new Html5Qrcode('qr-reader', { verbose: false });
            }

            // Stop if already running
            if (scannerRef.current.isScanning) {
                await scannerRef.current.stop();
            }

            const config = {
                fps: 15,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                disableFlip: false,
            };

            await scannerRef.current.start(
                devices[camIndex].id,
                config,
                (decodedText) => {
                    // Vibrate on success
                    if (navigator.vibrate) {
                        navigator.vibrate(200);
                    }
                    scannerRef.current.stop().then(() => {
                        onScan(decodedText);
                    }).catch(console.error);
                },
                () => { }
            );

            setIsStarting(false);
        } catch (err) {
            console.error('Camera error:', err);
            let errorMsg = 'ไม่สามารถเปิดกล้องได้';

            if (err.name === 'NotAllowedError') {
                errorMsg = 'กรุณาอนุญาตการเข้าถึงกล้อง แล้วรีเฟรชหน้าเว็บ';
            } else if (err.name === 'NotFoundError') {
                errorMsg = 'ไม่พบกล้อง';
            } else if (err.name === 'NotReadableError') {
                errorMsg = 'กล้องถูกใช้งานโดยแอปอื่น';
            } else if (err.message) {
                errorMsg = err.message;
            }

            setError(errorMsg);
            setIsStarting(false);
        }
    };

    const switchCamera = () => {
        if (cameras.length > 1) {
            const nextIndex = (currentCameraIndex + 1) % cameras.length;
            startScanner(nextIndex);
        }
    };

    useEffect(() => {
        // Wait for DOM to be ready before starting scanner
        const timer = setTimeout(() => {
            startScanner();
        }, 500);

        return () => {
            clearTimeout(timer);
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(console.error);
            }
        };
    }, []);

    const handleClose = async () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            await scannerRef.current.stop().catch(console.error);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black flex flex-col z-50">
            {/* Header */}
            <div className="bg-black bg-opacity-50 p-4 flex justify-between items-center">
                <h3 className="text-white font-bold flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    สแกน QR Code
                </h3>
                <div className="flex gap-2">
                    {cameras.length > 1 && !isStarting && !error && (
                        <button
                            onClick={switchCamera}
                            className="text-white p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30"
                        >
                            <SwitchCamera className="w-5 h-5" />
                        </button>
                    )}
                    <button
                        onClick={handleClose}
                        className="text-white p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Scanner Area */}
            <div className="flex-1 flex items-center justify-center relative">
                {error ? (
                    <div className="text-center p-8">
                        <div className="bg-red-500 bg-opacity-20 text-red-200 p-4 rounded-xl mb-4">
                            <p>{error}</p>
                        </div>
                        <button
                            onClick={() => startScanner()}
                            className="bg-white text-gray-800 px-6 py-3 rounded-xl font-medium flex items-center gap-2 mx-auto"
                        >
                            <RefreshCw className="w-5 h-5" />
                            ลองใหม่
                        </button>
                    </div>
                ) : isStarting ? (
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-4"></div>
                        <p className="text-white">กำลังเปิดกล้อง...</p>
                    </div>
                ) : null}

                {/* QR Reader Container - Full screen for better camera view */}
                <div
                    id="qr-reader"
                    className={`absolute inset-0 ${error || isStarting ? 'hidden' : ''}`}
                    style={{
                        width: '100%',
                        height: '100%',
                    }}
                />

                {/* Scan Frame Overlay */}
                {!error && !isStarting && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-64 h-64 border-2 border-white rounded-2xl relative">
                            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-xl"></div>
                            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-xl"></div>
                            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-xl"></div>
                            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-xl"></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            {!error && !isStarting && (
                <div className="bg-black bg-opacity-50 p-4 text-center">
                    <p className="text-white text-sm">วาง QR Code ให้อยู่ในกรอบ</p>
                </div>
            )}

            {/* Style override for html5-qrcode */}
            <style>{`
        #qr-reader video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 0 !important;
        }
        #qr-reader {
          border: none !important;
        }
        #qr-reader__scan_region {
          min-height: 100% !important;
        }
        #qr-reader__dashboard {
          display: none !important;
        }
        #qr-reader img {
          display: none !important;
        }
      `}</style>
        </div>
    );
}
