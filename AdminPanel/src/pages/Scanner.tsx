import React, { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { FaCheckCircle, FaTimesCircle, FaQrcode, FaCamera, FaUser, FaEnvelope, FaPhone, FaCalendar, FaClock, FaMapMarkerAlt, FaTicketAlt, FaChair } from "react-icons/fa";
import axios from "axios";
import { decryptQRData } from "../utils/qrEncryption";

const Scanner = () => {
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ticketData, setTicketData] = useState(null);
  const [decryptedInfo, setDecryptedInfo] = useState(null); // ✅ Store decrypted data
  const html5QrcodeScannerRef = useRef(null);
  const isScanningRef = useRef(false);
  const isInitializedRef = useRef(false);
  const isScannerRunningRef = useRef(false); // ✅ Track scanner state

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

  const initializeScanner = () => {
    if (isInitializedRef.current) return;
    
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
    };

    const container = document.getElementById("qr-reader");
    if (container) {
      container.innerHTML = '';
      
      html5QrcodeScannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        config,
        false
      );

      html5QrcodeScannerRef.current.render(onScanSuccess, onScanError);
      isInitializedRef.current = true;
      isScannerRunningRef.current = true; // ✅ Mark as running
    }
  };

  useEffect(() => {
    initializeScanner();

    return () => {
      if (html5QrcodeScannerRef.current) {
        html5QrcodeScannerRef.current.clear().catch((err) => {
          console.error("Failed to clear scanner:", err);
        });
      }
      isInitializedRef.current = false;
      isScannerRunningRef.current = false; // ✅ Mark as stopped
    };
  }, []);

  const onScanSuccess = async (decodedText, decodedResult) => {
    if (isScanningRef.current) {
      return;
    }

    console.log("📱 Encrypted QR scanned:", decodedText);
    isScanningRef.current = true;
    setScanResult(decodedText);
    setError(null);
    setDecryptedInfo(null); // Reset
    
    // ✅ Only pause if scanner is running
    if (html5QrcodeScannerRef.current && isScannerRunningRef.current) {
      try {
        html5QrcodeScannerRef.current.pause();
        isScannerRunningRef.current = false;
        console.log("✓ Scanner paused");
      } catch (pauseError) {
        console.warn("Could not pause scanner:", pauseError);
      }
    }
    
    try {
      let bookingId, ticketId;
      
      // ✅ TRY TO DECRYPT
      console.log("🔓 Attempting to decrypt...");
      const decryptedData = decryptQRData(decodedText);
      
      if (decryptedData) {
        // ✅ SUCCESSFULLY DECRYPTED
        console.log("✅ Decrypted data:", decryptedData);
        
        // ✅ Store decrypted data for display
        setDecryptedInfo({
          bookingReference: decryptedData.bookingReference,
          ticketId: decryptedData.ticketId,
          eventName: decryptedData.eventName,
          seat: decryptedData.seat,
          date: decryptedData.date,
          time: decryptedData.time,
          timestamp: new Date(decryptedData.timestamp).toLocaleString()
        });
        
        bookingId = decryptedData.bookingId;
        ticketId = decryptedData.ticketId;
        
        // ✅ Check timestamp (prevent old QR reuse)
        const qrAge = Date.now() - (decryptedData.timestamp || 0);
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (qrAge > maxAge) {
          throw new Error("QR code expired (older than 24 hours)");
        }
        
        console.log(`⏰ QR age: ${Math.floor(qrAge / 1000 / 60)} minutes`);
      } else {
        // ❌ DECRYPTION FAILED
        throw new Error("Invalid or tampered QR code - Cannot decrypt");
      }

      if (!bookingId || !ticketId) {
        throw new Error("Missing booking or ticket information");
      }

      console.log("🎫 Verifying ticket with backend...");
      await verifyTicket(bookingId, ticketId);
    } catch (err) {
      console.error("❌ Error processing QR code:", err);
      setError(err.message);
      isScanningRef.current = false;
    }
  };

  const onScanError = (errorMessage) => {
    // Suppress frequent scanning errors
  };

  const verifyTicket = async (bookingId, ticketId) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(
        `https://sabhyata.onrender.com/api/payments/verify-ticket/${bookingId}/${ticketId}`,
        // `http://localhost:5000/api/payments/verify-ticket/${bookingId}/${ticketId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          withCredentials: true,
        }
      );
      
      if (response.data.success) {
        setTicketData(response.data.data);
        console.log("✅ Ticket verified successfully!");
      } else {
        setError(response.data.message || "Verification failed");
        setTicketData(null);
      }
    } catch (err) {
      console.error("Error verifying ticket:", err);
      const errorMessage = err.response?.data?.message || "Failed to verify ticket";
      setError(errorMessage);
      setTicketData(null);
    } finally {
      setLoading(false);
      isScanningRef.current = false;
    }
  };

  const handleReset = () => {
    setScanResult(null);
    setTicketData(null);
    setError(null);
    setDecryptedInfo(null); // ✅ Reset decrypted data
    isScanningRef.current = false;
    
    if (html5QrcodeScannerRef.current) {
      html5QrcodeScannerRef.current.clear().then(() => {
        isInitializedRef.current = false;
        isScannerRunningRef.current = false;
        setTimeout(() => {
          initializeScanner();
        }, 100);
      }).catch((err) => {
        console.error("Error clearing scanner:", err);
        isInitializedRef.current = false;
        isScannerRunningRef.current = false;
        setTimeout(() => {
          initializeScanner();
        }, 100);
      });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const renderJSON = (data) => {
    if (!data) return null;
    
    return (
      <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
        <code>{JSON.stringify(data, null, 2)}</code>
      </pre>
    );
  };

  const renderSeats = (seats) => {
    if (!seats || seats.length === 0) {
      return (
        <div className="text-sm text-gray-500 text-center py-2">
          No seat information available
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {seats.map((seat, index) => (
          <div key={index} className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div>
                <div className="text-xs text-purple-700 font-medium">Seat ID</div>
                <div className="text-sm font-semibold text-gray-900">{seat.seatId}</div>
              </div>
              <div>
                <div className="text-xs text-purple-700 font-medium">Row</div>
                <div className="text-sm font-semibold text-gray-900">{seat.row}</div>
              </div>
              <div>
                <div className="text-xs text-purple-700 font-medium">Number</div>
                <div className="text-sm font-semibold text-gray-900">{seat.number}</div>
              </div>
              <div>
                <div className="text-xs text-purple-700 font-medium">Section</div>
                <div className="text-sm font-semibold text-gray-900">{seat.section}</div>
              </div>
              <div>
                <div className="text-xs text-purple-700 font-medium">Category</div>
                <div className="text-sm font-semibold text-gray-900 capitalize">{seat.category}</div>
              </div>
              <div>
                <div className="text-xs text-purple-700 font-medium">Price</div>
                <div className="text-sm font-bold text-green-700">₹{seat.price}</div>
              </div>
            </div>
            {/* {seat.status && (
              <div className="mt-2 pt-2 border-t border-purple-200">
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                  seat.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {seat.status}
                </span>
              </div>
            )} */}
          </div>
        ))}
      </div>
    );
  };

  const renderTicketDetails = (data) => {
    if (!data) return null;

    return (
      <div className="space-y-4">
        {/* ✅ SHOW DECRYPTED QR DATA */}
        {/* {decryptedInfo && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
            <div className="text-xs text-green-700 font-medium mb-2 flex items-center gap-2">
              <FaCheckCircle className="text-green-600" />
              QR CODE DECRYPTED SUCCESSFULLY
            </div>
            <div className="space-y-1 text-sm">
              <div><span className="font-medium">Booking:</span> {decryptedInfo.bookingReference}</div>
              <div><span className="font-medium">Ticket:</span> {decryptedInfo.ticketId}</div>
              <div><span className="font-medium">Event:</span> {decryptedInfo.eventName}</div>
              <div><span className="font-medium">Seat:</span> {decryptedInfo.seat}</div>
              <div><span className="font-medium">Date:</span> {decryptedInfo.date}</div>
              <div><span className="font-medium">Time:</span> {decryptedInfo.time}</div>
              <div className="text-xs text-gray-600 mt-2">QR Generated: {decryptedInfo.timestamp}</div>
            </div>
          </div>
        )} */}

        {/* Booking Reference */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
          <div className="text-xs text-blue-700 font-medium mb-1">BOOKING REFERENCE</div>
          <div className="font-bold text-xl text-gray-900">{data.bookingReference}</div>
        </div>

        {/* ... rest of your existing renderTicketDetails code ... */}
        <div className="border-t pt-4">
          <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FaTicketAlt className="text-red-600" />
            Event Information
          </h5>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <FaTicketAlt className="text-red-600 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-gray-600">Event Name</div>
                <div className="font-medium text-gray-900">{data.eventName}</div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <FaMapMarkerAlt className="text-red-600 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-gray-600">Venue</div>
                <div className="font-medium text-gray-900">{data.venue}</div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <FaCalendar className="text-red-600 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-gray-600">Date</div>
                <div className="font-medium text-gray-900">{formatDate(data.date)}</div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <FaClock className="text-red-600 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-gray-600">Time</div>
                <div className="font-medium text-gray-900">{data.time}</div>
              </div>
            </div>
          </div>
        </div>

        {data.seats && data.seats.length > 0 && (
          <div className="border-t pt-4">
            <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FaChair className="text-purple-600" />
              Seat Information ({data.seats.length} {data.seats.length === 1 ? 'Seat' : 'Seats'})
            </h5>
            {renderSeats(data.seats)}
          </div>
        )}

        <div className="border-t pt-4">
          <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FaUser className="text-blue-600" />
            Contact Information
          </h5>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <FaUser className="text-blue-600 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-gray-600">Name</div>
                <div className="font-medium text-gray-900">{data.contactInfo?.name}</div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <FaEnvelope className="text-blue-600 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-gray-600">Email</div>
                <div className="font-medium text-gray-900 break-all">{data.contactInfo?.email}</div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <FaPhone className="text-blue-600 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-gray-600">Phone</div>
                <div className="font-medium text-gray-900">{data.contactInfo?.phone}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h5 className="text-sm font-semibold text-gray-900 mb-3">Ticket Details</h5>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-600 mb-1">Count</div>
              <div className="font-medium text-gray-900 text-sm">{data.ticketCount}</div>
            </div>
            
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-xs text-green-700 mb-1">Total Amount</div>
              <div className="font-bold text-green-700 text-lg">₹{data.totalAmount}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4">
      <div className="max-w-md sm:max-w-2xl md:max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center gap-3 mb-2">
            <FaQrcode className="text-2xl sm:text-3xl text-blue-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">🔐 Encrypted QR Scanner</h1>
          </div>
          <p className="text-gray-600 text-xs sm:text-sm">
            Scan encrypted QR codes to verify tickets securely
          </p>
        </div>

        {/* Scanner Section */}
        {!scanResult && !ticketData && !loading && !error && (
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex items-center gap-2 mb-4">
              <FaCamera className="text-lg sm:text-xl text-gray-600" />
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Camera Scanner</h2>
            </div>
            <div id="qr-reader" className="w-full"></div>
            <p className="text-xs sm:text-sm text-gray-500 mt-4 text-center">
              Position the encrypted QR code within the frame to scan
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 text-center">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-sm sm:text-base">Verifying ticket...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex items-center gap-3 mb-4">
              <FaTimesCircle className="text-2xl sm:text-3xl text-red-500 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Verification Failed</h3>
                <p className="text-sm sm:text-base text-red-600">{error}</p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm sm:text-base font-medium"
            >
              Scan New Ticket
            </button>
          </div>
        )}

        {/* Success State */}
        {ticketData && !loading && !error && (
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <FaCheckCircle className="text-2xl sm:text-3xl text-green-500 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Ticket Verified Successfully</h3>
                <p className="text-sm text-green-600">✅ Valid ticket - Entry allowed</p>
              </div>
            </div>

            {/* Ticket Details */}
            <div className="mb-4 sm:mb-6">
              {renderTicketDetails(ticketData)}
            </div>

            {/* Raw JSON Data */}
            {/* <div className="mb-4">
              <details className="cursor-pointer">
                <summary className="text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  View Raw Data (JSON)
                </summary>
                {renderJSON(ticketData)}
              </details>
            </div> */}

            <button
              onClick={handleReset}
              className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm sm:text-base font-medium"
            >
              Scan Another Ticket
            </button>
          </div>
        )}

        {/* Instructions */}
        {!scanResult && !ticketData && !loading && !error && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
            <h3 className="text-xs sm:text-sm font-semibold text-blue-900 mb-2">🔐 Security Instructions:</h3>
            <ul className="text-xs sm:text-sm text-blue-800 space-y-1">
              <li>• QR codes are AES-256 encrypted</li>
              <li>• Only authorized scanners can decrypt</li>
              <li>• QR codes expire after 24 hours</li>
              <li>• Each scan is tracked and verified</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Scanner;
