import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, Mail, Phone } from "lucide-react";
import { getDeliveryDate, type EnrichedOrder } from "@/lib/orders";

/** Map fulfillment center code to short display label */
function getFLCode(fc: string): string {
  if (fc === "F01") return "FCH";
  if (fc === "MWO" || fc === "P63") return "MWO";
  return fc;
}

/** Arabic translations dictionary for mock/demo products */
const ARABIC_NAMES: Record<string, string> = {
  "Baby Brezza Bottle Washer Pro Detergent Tablets": "أقراص منظف غسالة زجاجات الأطفال بيبي بريزا برو",
  "Dr. Browns 5 oz / 150 ml PP Wide-Neck \"Options\" Baby Bottle, 2-Pack": "زجاجة رضاعة أطفال دكتور براونز سعة 150 مل (5 أونصة) ذات عنق عريض من البولي بروبيلين، عبوة من قطعتين",
  "Moon Baby Bath Sponge": "إسفنجة استحمام مون بيبي",
  "Munchkin Dots Bath Mat": "سجادة حمام منقوشة بنقاط مونشكن",
  "Elodie Details Pacifier (Faded Rose)": "لهاية إيلودي ديتي (لون وردي باهت)",
  "Babyhood Riya Cot - White/Beech": "سرير أطفال بيبي هود ريا - أبيض/خشب الزان",
  "TheKiddoz Bath and Changing Table - Animal design": "طاولة الاستحمام وتغيير الحفاضات من ذا كيدوز - تصميم حيواني",
  "Dr. Browns 5 oz/150 ml Glass W-N Options+ Bottle, 1-Pack": "زجاجة دكتور براونز سعة 150 مل (5 أونصة) من الزجاج W-N Options+، عبوة واحدة",
  "Frida Baby NoseFrida Saline Snot Spray": "بخاخ الأنف الملحي فريدا بيبي نوز فريدا",
  "SmarTrike STR3 6-in-1 Stroller-Trike (Black)": "عربة ودراجة سمارت ترايك STR3 6 في 1 (لون أسود)",
};

/** Get Arabic name of a product */
function getArabicName(name: string): string {
  return ARABIC_NAMES[name] || ARABIC_NAMES[name.replace(/\s+/g, " ").trim()] || "";
}

export function InvoicePrintLayout({
  orders,
  isGift = false,
}: {
  orders: EnrichedOrder[];
  isGift?: boolean;
}) {
  return (
    <>
      {orders.map((order, index) => (
        <div key={order.id} className={index > 0 ? "mt-16 print:mt-0 print:break-before-page" : ""}>
          {/* Top section */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-0 mb-6">
            {/* Logo Area */}
            <div className="flex items-center">
              <img src="https://halamama.com/cdn/shop/files/halamama_green.svg" alt="Halamama Logo" className="h-10" />
            </div>

            {/* Invoice Meta */}
            <div className="text-left sm:text-right text-sm">
              <div className="font-bold text-lg mb-2">
                {isGift
                  ? <>Gift Receipt No. {order.id} <span dir="rtl">:إيصال هدية</span></>
                  : <>Invoice No. {order.id} :فاتورة</>
                }
              </div>
              <div className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-slate-600">
                <div className="text-left sm:text-right">Order Date</div>
                <div className="text-left font-medium">{order.date}</div>
                <div className="text-left sm:text-right">Order Time</div>
                <div className="text-left font-medium">{order.time}</div>
                <div className="text-left sm:text-right">Delivery Date</div>
                <div className="text-left font-medium">{getDeliveryDate(order)}</div>
                {!isGift && (
                  <>
                    <div className="text-left sm:text-right">Payment</div>
                    <div className="text-left font-medium capitalize">{order.payment.balance > 0 ? "voided" : "paid"}</div>
                  </>
                )}
              </div>
            </div>
          </div>

          <hr className="border-slate-200 mb-6" />

          {/* Addresses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mb-6 text-sm">
            <div>
              <h3 className="font-bold mb-3">Billing Address <span className="font-normal" dir="rtl">عنوان الفاتورة</span></h3>
              <div className="font-bold mb-2">{order.customer.name}</div>
              <div className="text-slate-600 leading-relaxed">
                {order.shippingAddress.line1}<br />
                {order.shippingAddress.line2}<br />
                {order.shippingAddress.city}, {order.shippingAddress.country}<br />
                <div className="mt-2">{order.customer.phone}</div>
              </div>
            </div>
            <div>
              <h3 className="font-bold mb-3">Shipping Address <span className="font-normal" dir="rtl">عنوان الشحن</span></h3>
              <div className="font-bold mb-2">{order.customer.name}</div>
              <div className="text-slate-600 leading-relaxed">
                {order.shippingAddress.line1}<br />
                {order.shippingAddress.line2}<br />
                {order.shippingAddress.city}, {order.shippingAddress.country}<br />
                <div className="mt-2">{order.customer.phone}</div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-6 overflow-x-auto w-full -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin">
            <table className="w-full text-sm border-collapse min-w-[600px] sm:min-w-0">
              <thead>
                <tr className="border border-slate-200 bg-slate-50 text-left">
                  <th className="p-3 font-bold border-r border-slate-200 w-12 text-center">
                    <div>S.No</div>
                    <div className="text-xs font-normal text-slate-500 mt-1">الرقم</div>
                  </th>
                  <th className="p-3 font-bold border-r border-slate-200">
                    <div>Item Description</div>
                    <div className="text-xs font-normal text-slate-500 mt-1">العنصر</div>
                  </th>
                  <th className="p-3 font-bold border-r border-slate-200 w-24 text-center">
                    <div>Qty</div>
                    <div className="text-xs font-normal text-slate-500 mt-1">الكمية</div>
                  </th>
                  {!isGift && (
                    <th className="p-3 font-bold border-r border-slate-200 w-32 text-right">
                      <div>Unit Price</div>
                      <div className="text-xs font-normal text-slate-500 mt-1">سعر الوحدة</div>
                    </th>
                  )}
                  <th className="p-3 font-bold border-r border-slate-200 w-16 text-center">
                    <div>FL</div>
                    <div className="text-xs font-normal text-slate-500 mt-1">فل.</div>
                  </th>
                  {!isGift && (
                    <th className="p-3 font-bold w-32 text-right">
                      <div>Total</div>
                      <div className="text-xs font-normal text-slate-500 mt-1">الإجمالي</div>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {order.itemsList.map((item, idx) => {
                  const arabicName = getArabicName(item.name);
                  return (
                    <tr key={item.id} className="border-b border-slate-200">
                      <td className="p-3 border-r border-slate-200 text-center font-medium text-slate-600">
                        {idx + 1}
                      </td>
                      <td className="p-3 border-r border-slate-200">
                        <div className="flex items-center gap-3">
                          {item.image && (
                            <img src={item.image} alt={item.name} className="h-12 w-12 object-cover rounded shadow-sm border border-slate-100 flex-shrink-0 print:hidden" />
                          )}
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-800 text-sm">{item.name}</div>
                            {arabicName && (
                              <div className="text-xs text-slate-700 font-medium" dir="rtl">{arabicName}</div>
                            )}
                            <div className="text-[11px] text-slate-400">
                              {item.sku || "N/A"}{item.barcode ? ` | ${item.barcode}` : ""}
                            </div>
                            {item.bin && (
                              <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200/50">
                                LOC: {item.bin}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 border-r border-slate-200 text-center font-medium">
                        {isGift ? `x${item.qty}` : item.qty}
                      </td>
                      {!isGift && (
                        <td className="p-3 border-r border-slate-200 text-right">QAR {item.price.toFixed(2)}</td>
                      )}
                      <td className="p-3 border-r border-slate-200 text-center font-medium">
                        {getFLCode(item.fc)}
                      </td>
                      {!isGift && (
                        <td className="p-3 text-right">QAR {(item.price * item.qty).toFixed(2)}</td>
                      )}
                    </tr>
                  );
                })}
                {order.itemsList.length === 0 && (
                  <tr className="border-b border-slate-200">
                    <td colSpan={isGift ? 4 : 6} className="p-4 text-center text-slate-500">No items found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Area: 3-Column Grid */}
          {isGift ? (
            /* Gift Invoice Footer */
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-slate-200 text-xs text-slate-700 mt-8 mb-4 print:break-inside-avoid">
              {/* Column 1: Track Order & QR Code */}
              <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-2">
                <div className="font-bold text-slate-800 text-sm">
                  Track Order <span className="font-normal text-xs text-slate-500" dir="rtl">(تتبع الطلب)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-1.5 border border-slate-200 rounded bg-white shadow-xs shrink-0">
                    <QrCode className="w-12 h-12 text-slate-800" />
                  </div>
                  <div className="text-[11px] text-slate-600 leading-tight space-y-0.5">
                    <div className="font-medium">Scan for Policy</div>
                    <div dir="rtl" className="text-slate-500">امسح للاطلاع على السياسة</div>
                  </div>
                </div>
              </div>

              {/* Column 2: Email */}
              <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-1.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
                  <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Email Support</span>
                  <span className="font-normal text-xs text-slate-500" dir="rtl">(البريد الإلكتروني)</span>
                </div>
                <div className="text-slate-600 space-y-1">
                  <div className="font-semibold text-emerald-700 text-xs sm:text-sm">contactus@halamama.com</div>
                  <div className="text-[11px] text-slate-500">For inquiries, returns & help</div>
                  <div dir="rtl" className="text-[11px] text-slate-500">لأي استفسارات أو دعم</div>
                </div>
              </div>

              {/* Column 3: Contact Numbers */}
              <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-1.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
                  <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Contact Us</span>
                  <span className="font-normal text-xs text-slate-500" dir="rtl">(اتصل بنا)</span>
                </div>
                <div className="text-slate-600 space-y-1">
                  <div className="font-semibold text-slate-800 text-xs sm:text-sm" dir="ltr">+974 6658 3338</div>
                  <div className="text-[11px] text-slate-500">Customer Support Line</div>
                  <div dir="rtl" className="text-[11px] text-slate-500">خط دعم العملاء</div>
                </div>
              </div>
            </div>
          ) : (
            /* Normal Invoice Footer */
            <>
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
                {/* Left side: Payment Details */}
                <div className="border border-slate-200 rounded w-full sm:w-[300px] print:w-[300px]">
                  <div className="grid grid-cols-2 p-2 border-b border-slate-200 text-sm">
                    <div className="text-slate-600">Paid by Customer<br/><span className="text-xs">(المدفوع من قبل العميل)</span></div>
                    <div className="text-right font-medium mt-auto">QAR {order.payment.totalPaid.toFixed(2)}</div>
                  </div>
                  <div className="grid grid-cols-2 p-2 border-b border-slate-200 text-sm">
                    <div className="text-slate-600">Refunded <span className="text-xs ml-1">(تم رد المبلغ)</span></div>
                    <div className="text-right font-medium">-QAR 0.00</div>
                  </div>
                  <div className="grid grid-cols-2 p-2 border-b border-slate-200 text-sm">
                    <div className="text-slate-600">Outstanding Amount<br/><span className="text-xs">(المبلغ المستحق)</span></div>
                    <div className="text-right font-medium mt-auto">QAR {order.payment.balance.toFixed(2)}</div>
                  </div>
                  <div className="grid grid-cols-2 p-2 text-sm">
                    <div className="text-slate-600">Balance <span className="text-xs ml-1">(توازن)</span></div>
                    <div className="text-right font-medium">QAR 0.00</div>
                  </div>
                </div>

                {/* Right side: Subtotal, Discount, Shipping, Grand Total */}
                <div className="border border-slate-200 rounded w-full sm:w-[300px] print:w-[300px]">
                  <div className="grid grid-cols-2 p-2 border-b border-slate-200 text-sm">
                    <div className="text-slate-600">Subtotal <span className="text-xs ml-1">(المجموع الفرعي)</span></div>
                    <div className="text-right font-medium">QAR {order.payment.subtotal.toFixed(2)}</div>
                  </div>
                  <div className="grid grid-cols-2 p-2 border-b border-slate-200 text-sm">
                    <div className="text-slate-600">Discount <span className="text-xs ml-1">(الخصم)</span></div>
                    <div className="text-right font-medium">-QAR {order.payment.discount.toFixed(2)}</div>
                  </div>
                  <div className="grid grid-cols-2 p-2 border-b border-slate-200 text-sm">
                    <div className="text-slate-600">Shipping <span className="text-xs ml-1">(الشحن)</span></div>
                    <div className="text-right font-medium">QAR {order.payment.shipping.toFixed(2)}</div>
                  </div>
                  <div className="grid grid-cols-2 p-2 text-sm font-bold bg-slate-50">
                    <div>Grand Total <span className="text-xs font-normal ml-1">(المجموع الكلي)</span></div>
                    <div className="text-right">QAR {order.payment.total.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* 3-Column Footer Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-slate-200 text-xs text-slate-700 mt-8 mb-4 print:break-inside-avoid">
                {/* Column 1: Track Order & QR Code */}
                <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-2">
                  <div className="font-bold text-slate-800 text-sm">
                    Track Order <span className="font-normal text-xs text-slate-500" dir="rtl">(تتبع الطلب)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 border border-slate-200 rounded bg-white shadow-xs shrink-0">
                      <QrCode className="w-12 h-12 text-slate-800" />
                    </div>
                    <div className="text-[11px] text-slate-600 leading-tight space-y-0.5">
                      <div className="font-medium">Scan to Track Order & Policy</div>
                      <div dir="rtl" className="text-slate-500">امسح لتتبع الطلب والسياسة</div>
                    </div>
                  </div>
                </div>

                {/* Column 2: Email */}
                <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
                    <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Email Support</span>
                    <span className="font-normal text-xs text-slate-500" dir="rtl">(البريد الإلكتروني)</span>
                  </div>
                  <div className="text-slate-600 space-y-1">
                    <div className="font-semibold text-emerald-700 text-xs sm:text-sm">contactus@halamama.com</div>
                    <div className="text-[11px] text-slate-500">For inquiries, returns & help</div>
                    <div dir="rtl" className="text-[11px] text-slate-500">لأي استفسارات أو دعم</div>
                  </div>
                </div>

                {/* Column 3: Contact Numbers */}
                <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
                    <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Contact Us</span>
                    <span className="font-normal text-xs text-slate-500" dir="rtl">(اتصل بنا)</span>
                  </div>
                  <div className="text-slate-600 space-y-1">
                    <div className="font-semibold text-slate-800 text-xs sm:text-sm" dir="ltr">+974 6658 3338</div>
                    <div className="text-[11px] text-slate-500">Customer Support Line</div>
                    <div dir="rtl" className="text-[11px] text-slate-500">خط دعم العملاء</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      ))}
    </>
  );
}

import { createPortal } from "react-dom";

export function PrintInvoiceDialog({
  open,
  onOpenChange,
  orders,
  isGift = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: EnrichedOrder[];
  isGift?: boolean;
}) {
  if (!orders || orders.length === 0) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] sm:w-full sm:max-w-4xl p-0 overflow-hidden bg-background max-h-[90vh] flex flex-col print:hidden">
          <div className="p-6 pb-4 border-b border-border flex-shrink-0 print:hidden">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {isGift ? "Print Gift Invoice" : "Print Invoice"}
              </DialogTitle>
              <DialogDescription>
                You are about to print an invoice. Use the print button below to generate the receipt.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 bg-muted/5">
            {/* Invoice Paper Box */}
            <div className="border border-border rounded-lg bg-white text-slate-900 p-4 sm:p-8 relative print:max-h-none print:overflow-visible print:border-none print:p-0" id="invoice-print-area">
              <InvoicePrintLayout orders={orders} isGift={isGift} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-border flex-shrink-0 bg-muted/20 print:hidden">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="px-6">
              Close
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                window.print();
                onOpenChange(false);
              }}
              className="bg-[#14a0a0] hover:bg-[#108585] text-white px-6"
            >
              Print
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dedicated print portal directly appended to document.body outside #root and dialog overlays */}
      {open && createPortal(
        <div className="print-only">
          <div className="bg-white text-slate-900 p-8 w-full">
            <InvoicePrintLayout orders={orders} isGift={isGift} />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
