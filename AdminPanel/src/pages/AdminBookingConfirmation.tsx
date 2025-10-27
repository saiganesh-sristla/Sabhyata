import React, { useRef, useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const AdminBookingConfirmation = ({ bookingData, onClose }) => {
  const ticketRef = useRef(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const printTriggeredRef = useRef(false);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTimeRange = (time, duration) => {
    if (!time || !duration) return 'N/A';
    const start = new Date(`1970-01-01T${time}`);
    const end = new Date(start.getTime() + duration * 60 * 60 * 1000);
    return `${start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })} - ${end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
  };

  const handleDownloadTicket = async () => {
    if (!ticketRef.current) return;

    try {
      const canvas = await html2canvas(ticketRef.current, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const doc = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 180;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      doc.addImage(imgData, 'PNG', 15, 20, imgWidth, imgHeight);
      doc.save(`ticket_${bookingData?.bookingReference || 'booking'}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const handlePrintTicket = () => {
    if (!ticketRef.current || printTriggeredRef.current || isPrinting) return;

    printTriggeredRef.current = true;
    setIsPrinting(true);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow || iframe.contentDocument;
    if (iframeDoc.document) {
      const doc = iframeDoc.document;
      const ticketClone = ticketRef.current.cloneNode(true);

      const getAllStyles = () => {
        let styles = '';
        const styleSheets = Array.from(document.styleSheets);
        styleSheets.forEach((sheet) => {
          try {
            const rules = Array.from(sheet.cssRules || sheet.rules);
            rules.forEach((rule) => {
              styles += rule.cssText + '\n';
            });
          } catch (e) {}
        });
        return styles;
      };

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Ticket - ${bookingData?.bookingReference || 'booking'}</title>
            <meta charset="UTF-8">
            <style>
              ${getAllStyles()}
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; background: white; }
              @media print { body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; } @page { margin: 1cm; size: A4; } }
            </style>
          </head>
          <body>
            ${ticketClone.outerHTML}
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          printTriggeredRef.current = false;
          setIsPrinting(false);
        }, 500);
      }, 500);
    }
  };

  const totalAmount = bookingData?.totalAmount ? `₹${bookingData.totalAmount.toLocaleString('en-IN')}` : 'N/A';
  const seatsList = Array.isArray(bookingData?.seats) ? bookingData.seats : [];
  const seats = seatsList?.length
    ? seatsList.map((s) => s?.seatId || `${s?.row}${s?.number}` || JSON.stringify(s)).filter(Boolean).join(', ')
    : '';
  const eventName = bookingData?.event?.name || 'Event Name';
  const venue = bookingData?.event?.venue || 'Venue';
  const eventDate = bookingData?.date ? formatDate(new Date(bookingData.date)) : 'N/A';
  const eventTime = bookingData?.time ? formatTimeRange(bookingData.time, bookingData?.event?.duration) : 'N/A';
  const ticketCount = bookingData?.tickets?.length || 0;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold text-green-600 mb-4">Booking Confirmed!</h2>
        <div ref={ticketRef} className="mb-6">
          <div className="bg-red-700 text-white p-3 rounded-t-lg flex justify-between items-center">
            <div>
              <div className="text-xs font-medium">E-TICKET</div>
              <div className="text-xs opacity-90">Booking Ref: {bookingData?.bookingReference}</div>
            </div>
            <div className="text-right">
              <div className="text-xs">Valid for Entry</div>
              <div className="text-xs opacity-90">{eventDate}</div>
            </div>
          </div>
          <div className="border-l border-r border-gray-200 p-4">
            <div className="flex gap-3 mb-4">
              <img
                src={bookingData?.event?.images?.[0] ? `https://sabhyata-foundation.onrender.com/${bookingData.event.images[0]}` : 'https://via.placeholder.com/80'}
                alt={eventName}
                className="w-16 h-16 object-cover rounded"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">{eventName}</h3>
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <span>📍</span>
                    <span>{venue}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>📅</span>
                    <span>{eventDate}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>🕒</span>
                    <span>{eventTime}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-xs text-gray-600 mb-1">{bookingData.seats?.length > 0 ? 'SEAT DETAILS' : 'PARTICIPANT DETAILS'}</div>
                <div className="font-semibold text-lg">{seats || `${ticketCount} Participants`}</div>
                <div className="text-xs text-gray-600">
                  {bookingData?.event?.type === 'walking' ? 'Walking Tour' : bookingData?.event?.configureSeats ? 'Configured Seating' : 'Normal Section'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-600 mb-1">TOTAL AMOUNT</div>
                <div className="font-semibold text-lg text-red-600">{totalAmount}</div>
                <div className="text-xs text-gray-600">{ticketCount} Tickets</div>
              </div>
            </div>
            <div className="text-center mb-4">
              <div className="text-xs text-gray-600 mb-2">SCAN FOR ENTRY</div>
              <div className="flex justify-center gap-4 flex-wrap">
                {bookingData.tickets.map((ticket, index) => {
                  const seatObj = seatsList[index];
                  const seatLabel = seatsList?.length > 0
                    ? (typeof seatObj === 'string' ? seatObj : seatObj?.seatId || `${seatObj?.row}${seatObj?.number}` || `Seat ${index + 1}`)
                    : `${ticket.type.charAt(0).toUpperCase() + ticket.type.slice(1)} ${index + 1}`;
                  const qrData = JSON.stringify({
                    bookingId: bookingData?.bookingReference,
                    ticketId: ticket.ticketId,
                    eventName,
                    seat: seatLabel,
                    date: eventDate,
                  });

                  return (
                    <div key={ticket.ticketId} className="text-center">
                      <div className="text-xs font-medium mb-1">P{index + 1} - {seatLabel} {ticket.isUsed ? '(Used)' : ''}</div>
                      <div className="w-20 h-20 bg-white border-2 border-red-600 rounded flex items-center justify-center mx-auto">
                        <QRCode value={qrData} size={64} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="bg-red-700 text-white text-center py-3 rounded-b-lg">
            <p className="text-xs font-medium">*Present this QR code at the venue entrance*</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={handleDownloadTicket}
            className="bg-red-700 text-white py-3 rounded-md flex items-center justify-center gap-2 text-sm font-medium hover:bg-red-800"
          >
            Download Ticket
          </button>
          <button
            onClick={handlePrintTicket}
            disabled={isPrinting}
            className="border border-red-700 text-red-700 py-3 rounded-md flex items-center justify-center gap-2 text-sm font-medium hover:bg-red-50 disabled:opacity-50"
          >
            {isPrinting ? 'Printing...' : 'Print Ticket'}
          </button>
        </div>
        <div className="flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminBookingConfirmation;