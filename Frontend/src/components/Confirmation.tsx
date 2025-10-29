import { useState, useEffect, useRef } from "react";
import {
  Check,
  Download,
  Printer,
  MapPin,
  Calendar,
  Clock,
  AlertTriangle,
  MessageCircle,
  Mail,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useParams } from "react-router-dom";
import { encryptQRData } from '@/lib/qrEncryption';
import QRCode from "react-qr-code";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function BookingConfirmation() {
  const { id } = useParams();
  const [bookingData, setBookingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [currentTicketIndex, setCurrentTicketIndex] = useState(0);
  const ticketRefs = useRef({}); // Ref object for each ticket
  const printTriggeredRef = useRef(false);

  const API_URL =
    import.meta.env.VITE_API_BASE_URL ||
    "https://sabhyata.onrender.com/api";
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        if (!id) {
          setError("No booking ID provided");
          setLoading(false);
          return;
        }
        setLoading(true);
        const res = await fetch(`${API_URL}/bookings/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (data.success) {
          setBookingData(data.data);
        } else {
          setError(data.message || "No booking found for the given ID");
        }
      } catch (error) {
        console.error("Failed to fetch booking data:", error);
        setError("Failed to fetch booking data");
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [id, token, API_URL]);

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTimeRange = (time, duration) => {
    if (!time || !duration) return "N/A";
    const start = new Date(`1970-01-01T${time}`);
    const end = new Date(start.getTime() + duration * 60 * 60 * 1000);
    return `${start.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })} - ${end.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })}`;
  };

  const totalAmount = bookingData?.totalAmount
    ? `₹${Math.round(bookingData.totalAmount).toLocaleString("en-IN")}`
    : "N/A";

  const seatsList = Array.isArray(bookingData?.seats) ? bookingData.seats : [];
  const seats = seatsList?.length
    ? seatsList
        .map((s) => {
          if (!s) return '';
          if (typeof s === 'string') return s;
          return s.seatId || s.number || (s.row && s.number ? `${s.row}${s.number}` : JSON.stringify(s));
        })
        .filter(Boolean)
        .join(', ')
    : "";
  const eventName = bookingData?.event?.name || "Event Name";
  const venue = bookingData?.event?.venue || "Venue";
  const eventDate = bookingData?.date
    ? formatDate(new Date(bookingData.date))
    : "N/A";
  const eventTime = bookingData?.time
    ? formatTimeRange(bookingData.time, bookingData?.event?.duration)
    : "N/A";
  const ticketCount = bookingData?.tickets?.length || seatsList.length || (bookingData?.adults || 0) + (bookingData?.children || 0) || 0;

  // Generate tickets array if empty (for seats or participants)
  const generateTickets = () => {
    if (bookingData?.tickets?.length > 0) return bookingData.tickets;

    const tickets = [];
    if (seatsList.length > 0) {
      // Generate one ticket per seat
      seatsList.forEach((seat, index) => {
        const seatLabel = typeof seat === 'string' ? seat : seat?.seatId || seat?.number || (seat?.row && seat?.number ? `${seat.row}${seat.number}` : `Seat ${index + 1}`);
        tickets.push({
          ticketId: `TKT-${bookingData?.bookingReference || id}-${seatLabel}-${index + 1}`,
          type: 'seat',
          isUsed: false,
          seatLabel: seatLabel
        });
      });
    } else {
      // Generate tickets based on adults/children
      const totalParticipants = (bookingData?.adults || 0) + (bookingData?.children || 0);
      for (let i = 0; i < totalParticipants; i++) {
        const type = i < (bookingData?.adults || 0) ? 'adult' : 'child';
        tickets.push({
          ticketId: `TKT-${bookingData?.bookingReference || id}-${type}-${i + 1}`,
          type: type,
          isUsed: false,
          seatLabel: `${type.charAt(0).toUpperCase() + type.slice(1)} ${i + 1}`
        });
      }
    }
    return tickets;
  };

  const tickets = generateTickets();

  const handleDownloadTicket = async () => {
    if (tickets.length === 0) return;

    try {
      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 30; // 15mm margins on each side
      const imgHeight = (pageHeight - 40); // Fit to page height minus margins
      const imgX = 15;
      let imgY = 20;

      for (let i = 0; i < tickets.length; i++) {
        // Temporarily set current index to render the specific ticket
        setCurrentTicketIndex(i);

        // Wait a tick for re-render
        await new Promise(resolve => setTimeout(resolve, 100));

        if (ticketRefs.current[i]) {
          const canvas = await html2canvas(ticketRefs.current[i], { 
            scale: 3, 
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            width: ticketRefs.current[i].scrollWidth,
            height: ticketRefs.current[i].scrollHeight,
          });

          const imgData = canvas.toDataURL("image/png");
          const actualImgHeight = (canvas.height * imgWidth) / canvas.width;

          // Add new page if not first
          if (i > 0) {
            doc.addPage();
          }

          // Scale if too tall
          if (actualImgHeight > pageHeight - 40) {
            const scaleFactor = (pageHeight - 40) / actualImgHeight;
            const scaledWidth = imgWidth * scaleFactor;
            doc.addImage(imgData, "PNG", imgX, imgY, scaledWidth, pageHeight - 40);
          } else {
            doc.addImage(imgData, "PNG", imgX, imgY, imgWidth, actualImgHeight);
          }
        }
      }

      // Reset to first ticket
      setCurrentTicketIndex(0);

      doc.save(`tickets_${bookingData?.bookingReference || id}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  const handlePrintTicket = () => {
    if (tickets.length === 0 || printTriggeredRef.current || isPrinting) return;

    printTriggeredRef.current = true;
    setIsPrinting(true);

    // For print, we'll generate a single printable page with all tickets stacked vertically
    const printContainer = document.createElement('div');
    printContainer.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; 
      background: white; z-index: 9999; padding: 20px; overflow-y: auto;
      font-family: system-ui, sans-serif;
    `;

    // Clone and stack all tickets
    tickets.forEach((ticket, index) => {
      setCurrentTicketIndex(index);
      // Wait for re-render, then clone
      setTimeout(() => {
        if (ticketRefs.current[index]) {
          const ticketClone = ticketRefs.current[index].cloneNode(true);
          printContainer.appendChild(ticketClone);
        }
      }, index * 100);
    });

    document.body.appendChild(printContainer);
    window.print();

    setTimeout(() => {
      document.body.removeChild(printContainer);
      printTriggeredRef.current = false;
      setIsPrinting(false);
      setCurrentTicketIndex(0);
    }, 1000);
  };

  const handleShareWhatsApp = async () => {
    const bookingRef = bookingData?.bookingReference || id;
    const pdfBlob = await generateTicketPDF();
    
    if (pdfBlob && navigator.share && navigator.canShare({ files: [new File([pdfBlob], `ticket_${bookingRef}.pdf`, { type: 'application/pdf' })] })) {
      try {
        const file = new File([pdfBlob], `ticket_${bookingRef}.pdf`, { type: 'application/pdf' });
        await navigator.share({
          title: `Booking Confirmation - ${eventName}`,
          text: `🎟️ Booking Confirmed! Join me for ${eventName} at ${venue} on ${eventDate} at ${eventTime}. Booking Ref: ${bookingRef}`,
          files: [file]
        });
        return;
      } catch (error) {
        console.log("Share failed, falling back to text share");
      }
    }
    
    const message = `🎟️ Booking Confirmed! Join me for ${eventName} at ${venue} on ${eventDate} at ${eventTime}. Booking Ref: ${bookingRef}. Seats/Participants: ${
      seats || "Walking Tour"
    }. Total: ${totalAmount}.`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const handleShareEmail = async () => {
    const bookingRef = bookingData?.bookingReference || id;
    const pdfBlob = await generateTicketPDF();
    
    if (pdfBlob && navigator.share && navigator.canShare({ files: [new File([pdfBlob], `ticket_${bookingRef}.pdf`, { type: 'application/pdf' })] })) {
      try {
        const file = new File([pdfBlob], `ticket_${bookingRef}.pdf`, { type: 'application/pdf' });
        await navigator.share({
          title: `Booking Confirmation for ${eventName}`,
          text: `Your booking for ${eventName} has been confirmed!\n\nDetails:\n- Booking Ref: ${bookingRef}\n- Venue: ${venue}\n- Date: ${eventDate}\n- Time: ${eventTime}`,
          files: [file]
        });
        return;
      } catch (error) {
        console.log("Share failed, falling back to mailto");
      }
    }

    const subject = `Booking Confirmation for ${eventName}`;
    const body = `Your booking for ${eventName} has been confirmed!\n\nDetails:\n- Booking Ref: ${bookingRef}\n- Venue: ${venue}\n- Date: ${eventDate}\n- Time: ${eventTime}\n- Seats/Participants: ${
      seats || "Walking Tour"
    }\n- Total Amount: ${totalAmount}\n- Tickets: ${ticketCount}\n\nPresent the QR code at the venue entrance.`;
    const mailto = `mailto:?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#8B1538]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-6 text-red-600">
        <p>{error}</p>
      </div>
    );
  }

  if (!bookingData) {
    return (
      <div className="text-center p-6 text-red-600">
        <p>No booking data found</p>
      </div>
    );
  }

  const currentTicket = tickets[currentTicketIndex];
  const seatLabel = currentTicket?.seatLabel || (seatsList?.length > 0
    ? (typeof seatsList[currentTicketIndex] === 'string'
        ? seatsList[currentTicketIndex]
        : seatsList[currentTicketIndex]?.seatId || `Seat ${currentTicketIndex + 1}`)
    : `${currentTicket?.type?.charAt(0).toUpperCase() + currentTicket?.type?.slice(1)} ${currentTicketIndex + 1}`);

  // Generate QR data for current ticket
  const originalData = {
    bookingId: id,
    bookingReference: bookingData?.bookingReference,
    ticketId: currentTicket?.ticketId,
    eventName: eventName,
    seat: seatLabel,
    date: eventDate,
    time: eventTime,
    timestamp: Date.now()
  };
  const encryptedData = encryptQRData(originalData);

  const nextTicket = () => setCurrentTicketIndex((prev) => (prev + 1) % tickets.length);
  const prevTicket = () => setCurrentTicketIndex((prev) => (prev - 1 + tickets.length) % tickets.length);

  const generateTicketPDF = async () => {
    if (tickets.length === 0) return null;

    try {
      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 30;
      let imgY = 20;

      for (let i = 0; i < tickets.length; i++) {
        setCurrentTicketIndex(i);
        await new Promise(resolve => setTimeout(resolve, 100));

        if (ticketRefs.current[i]) {
          const canvas = await html2canvas(ticketRefs.current[i], { 
            scale: 3, 
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            width: ticketRefs.current[i].scrollWidth,
            height: ticketRefs.current[i].scrollHeight,
          });

          const imgData = canvas.toDataURL("image/png");
          const actualImgHeight = (canvas.height * imgWidth) / canvas.width;

          if (i > 0) doc.addPage();

          if (actualImgHeight > pageHeight - 40) {
            const scaleFactor = (pageHeight - 40) / actualImgHeight;
            const scaledWidth = imgWidth * scaleFactor;
            doc.addImage(imgData, "PNG", 15, imgY, scaledWidth, pageHeight - 40);
          } else {
            doc.addImage(imgData, "PNG", 15, imgY, imgWidth, actualImgHeight);
          }
        }
      }

      setCurrentTicketIndex(0);
      return doc.output('blob');
    } catch (error) {
      console.error("Error generating PDF:", error);
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto bg-white rounded-lg shadow-sm">
        <div className="text-center p-6">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-green-600 mb-2">
            Booking Confirmed!
          </h1>
          <p className="text-gray-600 text-sm">
            Your tickets have been successfully booked
          </p>
        </div>

        <div className="mb-6">
          {tickets.map((ticket, index) => (
            <div
              key={ticket.ticketId}
              ref={(el) => (ticketRefs.current[index] = el)}
              className={`mx-4 mb-6 relative ${index === currentTicketIndex ? 'block' : 'hidden'}`}>
              {/* Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 overflow-hidden">
                <img
                  src="https://i.ibb.co/RTdCGXqg/image.png"
                  alt="Watermark"
                  className="opacity-10"
                  style={{
                    width: '400px',
                    transform: 'rotate(-45deg)',
                  }}
                  crossOrigin="anonymous"
                />
              </div>

              {/* Logo at top */}
              <div className="flex justify-center py-3 bg-white rounded-t-lg border-l border-r border-t border-gray-200">
                <img
                  src="https://i.ibb.co/RTdCGXqg/image.png"
                  alt="Sabhyata Foundation"
                  className="h-10"
                  crossOrigin="anonymous"
                />
              </div>

              <div className="bg-red-700 text-white p-3 flex justify-between items-center relative z-20">
                <div>
                  <div className="text-xs font-medium">E-TICKET</div>
                  <div className="text-xs opacity-90">Booking Ref: {bookingData?.bookingReference || id}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs">Valid for Entry</div>
                  <div className="text-xs opacity-90">{eventDate}</div>
                </div>
              </div>

              <div className="border-l border-r border-gray-200 p-4 relative z-20">
                <div className="flex gap-3 mb-4">
                  <img
                    src={
                      bookingData?.event?.images?.[0]
                        ? `https://sabhyata.onrender.com/${bookingData.event.images[0]}`
                        : "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=80&h=80&fit=crop"
                    }
                    alt={eventName}
                    className="w-24 h-18 object-cover rounded"
                    crossOrigin="anonymous"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {eventName}
                    </h3>
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

              <div>
                <div className="text-center mb-4 mt-10">
                  <div className="text-xs text-gray-600 mb-2">SCAN FOR ENTRY</div>
                  <div className="w-48 h-48 p-2 bg-white border-2 border-red-600 rounded flex items-center justify-center mx-auto">
                    <QRCode
                      value={encryptedData}
                      size={170}
                      level="H"
                    />
                  </div>
                </div>
                
                <div className="flex justify-between items-start mb-4 -mt-10">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">
                      {bookingData.seats?.length > 0
                        ? "SEAT DETAILS"
                        : "PARTICIPANT DETAILS"}
                    </div>
                    <div className="font-semibold text-lg">
                      {seatLabel}
                    </div>
                    <div className="text-xs text-gray-600">
                      {bookingData?.event?.type === "walking"
                        ? "Walking Tour"
                        : bookingData?.event?.configureSeats
                        ? "Configured Seating"
                        : "Normal Section"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-600 mb-1">TOTAL AMOUNT</div>
                    <div className="font-semibold text-lg text-red-600">
                      {totalAmount}
                    </div>
                    <div className="text-xs text-gray-600">
                      {tickets.length} Tickets
                    </div>
                  </div>
                </div>
              </div>

                {/* Important Note */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                  <div className="flex gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800 mb-1">
                        Important Note
                      </h4>
                      <p className="text-xs text-yellow-700">
                        Please carry a valid ID for entry. Gates open 1 hour before the
                        show. No outside food or beverages allowed.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-red-700 text-white text-center py-3 rounded-b-lg relative z-20">
                <p className="text-xs font-medium">
                  *Present this QR code at the venue entrance*
                </p>
              </div>
            </div>
          ))}

          {/* Carousel Navigation */}
          {tickets.length > 1 && (
            <div className="flex justify-center items-center gap-4 mx-4 pb-4">
              <button
                onClick={prevTicket}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">
                Ticket {currentTicketIndex + 1} of {tickets.length}
              </span>
              <button
                onClick={nextTicket}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="px-4 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleDownloadTicket}
              className="bg-red-700 text-white py-3 rounded-md flex items-center justify-center gap-2 text-sm font-medium hover:bg-red-800">
              <Download className="w-4 h-4" />
              Download Ticket{tickets.length > 1 ? 's' : ''}
            </button>
            <button
              onClick={handlePrintTicket}
              disabled={isPrinting}
              className="border border-red-700 text-red-700 py-3 rounded-md flex items-center justify-center gap-2 text-sm font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed">
              {isPrinting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700"></div>
                  Printing...
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  Print All Tickets
                </>
              )}
            </button>
          </div>
        </div>

        {/* Share Section - Hidden for now */}
        {/* <div className="px-4 mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Share Your Ticket
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleShareWhatsApp}
              className="bg-green-500 text-white py-3 rounded-md flex items-center justify-center gap-2 text-sm font-medium hover:bg-green-600"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </button>
            <button
              onClick={handleShareEmail}
              className="bg-blue-500 text-white py-3 rounded-md flex items-center justify-center gap-2 text-sm font-medium hover:bg-blue-600"
            >
              <Mail className="w-4 h-4" />
              Email
            </button>
          </div>
        </div> */}

        <div className="px-4 pb-6 text-center">
          <p className="text-xs text-gray-500">
            Need help? Contact us at info@sabhyatafoundation.com or call +91 93197 64598
          </p>
        </div>
      </div>
    </div>
  );
}