/* English / Arabic for the dashboard.
 *
 * The language is remembered in this browser (localStorage "bolika-admin-lang").
 * Arabic turns the dashboard right-to-left. Text goes through
 * t("English text", { vars }); the English text is the key, so anything not
 * listed below stays English.
 */

const KEY = "bolika-admin-lang";
export const lang = (() => { try { return localStorage.getItem(KEY) === "ar" ? "ar" : "en"; } catch { return "en"; } })();
export const AR = lang === "ar";
document.documentElement.lang = lang;
document.documentElement.dir = AR ? "rtl" : "ltr";
if (AR) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&family=Amiri:wght@400;700&display=swap";
  document.head.append(link);
  document.title = "بوليكا — لوحة التحكم";
}

export function setLang(l) {
  try { localStorage.setItem(KEY, l); } catch { /* private mode */ }
  location.reload();
}
export const langButton = () =>
  `<button type="button" class="lang" data-lang-switch lang="${AR ? "en" : "ar"}" aria-label="${AR ? "Switch to English" : "التبديل إلى العربية"}">${AR ? "EN" : "عربي"}</button>`;
document.addEventListener("click", (e) => { if (e.target.closest("[data-lang-switch]")) setLang(AR ? "en" : "ar"); });

export function t(s, vars) {
  let out = (AR && DICT[s]) || s;
  if (vars) out = out.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
  return out;
}
/** the Arabic name when the dashboard is in Arabic and there is one */
export const ar = (en, arText) => (AR && arText ? arText : en);
export const locale = AR ? "ar-EG-u-nu-latn" : "en-GB";

const DICT = {
  // shell + sign in
  Sales: "المبيعات", Orders: "الطلبات", Products: "المنتجات", Categories: "الفئات", Discounts: "الخصومات", Delivery: "التوصيل",
  "Sign out": "تسجيل الخروج",
  "Owner dashboard": "لوحة تحكم المالك",
  "Sign in with your owner account.": "سجّل الدخول بحساب المالك.",
  Email: "البريد الإلكتروني", Password: "كلمة المرور", "Sign in": "تسجيل الدخول",
  "Wrong email or password.": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
  "This account isn't an owner account.": "هذا الحساب ليس حساب مالك.",
  "This account can't open the dashboard.": "هذا الحساب لا يمكنه فتح لوحة التحكم.",
  "Select all": "تحديد الكل",
  "Resend receipt email": "إعادة إرسال إيصال البريد", "Receipt email sent": "تم إرسال الإيصال",
  "Loading…": "جارٍ التحميل…",
  "Couldn't load this page": "تعذّر تحميل هذه الصفحة",
  "Not connected": "غير متصل",
  Close: "إغلاق",
  // statuses
  Pending: "قيد الانتظار", Confirmed: "تم التأكيد", Preparing: "قيد التجهيز", Shipped: "خرج للتوصيل", Delivered: "تم التوصيل", Cancelled: "ملغي",
  // dashboard
  "7 days": "7 أيام", "30 days": "30 يومًا", "90 days": "90 يومًا", "12 months": "12 شهرًا", Period: "الفترة",
  "Cancelled orders are left out of revenue.": "الطلبات الملغاة لا تُحسب في الإيرادات.",
  Revenue: "الإيرادات", "{m} delivered": "{m} تم توصيلها",
  "{n} cancelled": "{n} ملغي", "Average order": "متوسط الطلب", "{n} items sold": "{n} قطعة مباعة",
  Customers: "العملاء", "placed an order": "قدّموا طلبًا",
  "Revenue per day": "الإيرادات اليومية", "Orders by status": "الطلبات حسب الحالة", "Best sellers": "الأكثر مبيعًا",
  Product: "المنتج", Sold: "المباع", "No sales in this period yet.": "لا توجد مبيعات في هذه الفترة بعد.",
  "Latest orders": "أحدث الطلبات", "All orders →": "كل الطلبات ←", "No orders yet.": "لا توجد طلبات بعد.",
  "Week of {d}": "أسبوع {d}", "{n} order": "{n} طلب", "{n} orders": "{n} طلب",
  "Revenue per week": "الإيرادات الأسبوعية",
  // orders
  All: "الكل", "Order #, name or phone": "رقم الطلب أو الاسم أو الهاتف",
  Order: "الطلب", Customer: "العميل", City: "المدينة", Items: "القطع", Status: "الحالة", Total: "الإجمالي", Placed: "تاريخ الطلب",
  "No orders here": "لا توجد طلبات هنا", "Try another filter.": "جرّب فلترًا آخر.",
  "Orders from the website show up here.": "تظهر هنا الطلبات القادمة من الموقع.",
  "← Newer": "→ الأحدث", "Older →": "الأقدم ←", "Page {p} of {n}": "صفحة {p} من {n}",
  "← Orders": "→ الطلبات", "Order #{n}": "طلب رقم {n}", "Placed {d} · Cash on delivery": "تم الطلب {d} · الدفع عند الاستلام",
  "−{p}% (was {m})": "−{p}% (كان {m})", Subtotal: "المجموع الفرعي", Free: "مجاني", "Total to collect": "المطلوب تحصيله",
  "Update status": "تحديث الحالة", "Note for the customer (optional)": "ملاحظة للعميل (اختياري)",
  "e.g. Courier will call before arriving": "مثال: سيتصل المندوب قبل الوصول", "Save status": "حفظ الحالة", "Status saved": "تم حفظ الحالة",
  History: "السجل",
  // products
  "{n} products · {h} hidden": "{n} منتج · {h} مخفي", "+ Add product": "+ إضافة منتج", "Search name, size, barcode": "ابحث بالاسم أو الحجم أو الباركود",
  "Sub-category": "الفئة الفرعية", Price: "السعر", Stock: "المخزون", Shop: "المتجر", "{n} colours": "{n} ألوان", "−{p}% now": "−{p}% الآن",
  "No products match": "لا توجد منتجات مطابقة", "Shown in the shop": "ظاهر في المتجر", "Hidden from the shop": "مخفي من المتجر",
  "Edit product": "تعديل المنتج", "Add product": "إضافة منتج", "No photo": "لا توجد صورة", "Upload photo": "رفع صورة",
  "PNG or WebP with a transparent background looks best.": "صور PNG أو WebP بخلفية شفافة تبدو أفضل.",
  Name: "الاسم", "Name in Arabic": "الاسم بالعربية", Size: "الحجم", "Choose…": "اختر…", "Price (EGP)": "السعر (ج.م)",
  "Leave empty = coming soon": "اتركه فارغًا = قريبًا", "Empty = not tracked": "فارغ = غير متتبَّع", Barcode: "الباركود",
  Yes: "نعم", "No — hidden": "لا — مخفي", Description: "الوصف", "Description in Arabic": "الوصف بالعربية",
  Colours: "الألوان", "+ Add colour": "+ إضافة لون",
  "For products sold in several colours (one card with a colour bar). Leave a colour's price empty to use the product price.":
    "للمنتجات المتوفرة بعدة ألوان (بطاقة واحدة بشريط ألوان). اترك سعر اللون فارغًا ليُستخدم سعر المنتج.",
  "Colour name": "اسم اللون", "Arabic name": "الاسم بالعربية", "Swatch colour": "لون العينة", Photo: "صورة", "Remove colour": "إزالة اللون",
  Delete: "حذف", "Save changes": "حفظ التغييرات", "Uploading…": "جارٍ الرفع…", "Photo uploaded": "تم رفع الصورة",
  "Delete “{name}”? Past orders keep their copy of it. To take it off the shop for now, hide it instead.":
    "حذف «{name}»؟ تحتفظ الطلبات السابقة بنسختها منه. لإخفائه من المتجر مؤقتًا، أخفِه بدلًا من حذفه.",
  "Product deleted": "تم حذف المنتج",
  "The background is removed and the product is framed like the others. A photo on a plain background works best.":
    "تُزال الخلفية ويوضع المنتج في الإطار مثل باقي المنتجات. الصورة على خلفية سادة تعطي أفضل نتيجة.",
  "Removing the background…": "جارٍ إزالة الخلفية…", "Preparing the photo…": "جارٍ تجهيز الصورة…",
  "Background removed.": "تمت إزالة الخلفية.",
  "The background couldn't be removed, so the photo is framed as it is.": "تعذّرت إزالة الخلفية، فوُضعت الصورة في الإطار كما هي.",
  "Use the original photo": "استخدم الصورة الأصلية", "Using the original photo.": "يتم استخدام الصورة الأصلية.", "Use the cut-out": "استخدم الصورة المقصوصة", "Remove more background": "إزالة المزيد من الخلفية", "Remove less": "إزالة أقل",
  "Choose a category first": "اختر الفئة أولًا", "None — directly in the category": "بدون — مباشرة في الفئة",
  "+ New sub-category…": "+ فئة فرعية جديدة…", "Name of the new sub-category (in English):": "اسم الفئة الفرعية الجديدة (بالإنجليزية):",
  "Sub-category added": "تمت إضافة الفئة الفرعية", Saved: "تم الحفظ", "Product added": "تمت إضافة المنتج",
  "The Arabic fills in as you type the English name. Check it and change any word you like.": "يُكتب الاسم العربي تلقائيًا أثناء كتابة الاسم الإنجليزي. راجعه وعدّل أي كلمة تريدها.",
  // categories
  "{c} categories · {s} sub-categories": "{c} فئات · {s} فئة فرعية", "+ Add category": "+ إضافة فئة",
  "{n} sub-categories": "{n} فئة فرعية", Edit: "تعديل", "+ Sub-category": "+ فئة فرعية", Group: "المجموعة",
  "Label in group": "الاسم داخل المجموعة", Position: "الترتيب", "No sub-categories yet.": "لا توجد فئات فرعية بعد.",
  "Edit category": "تعديل الفئة", "Add category": "إضافة فئة", "Short id (used in links)": "معرّف قصير (يُستخدم في الروابط)",
  Save: "حفظ", "Category deleted": "تم حذف الفئة",
  "Delete “{name}” and all its sub-categories? Its products stay, but without a sub-category (hidden from the browse tree) until you move them.":
    "حذف «{name}» وكل فئاتها الفرعية؟ تبقى منتجاتها، لكن بدون فئة فرعية (مخفية من قائمة التصفح) حتى تنقلها.",
  "Edit sub-category": "تعديل الفئة الفرعية", "Add sub-category": "إضافة فئة فرعية", Category: "الفئة",
  "Group (optional)": "المجموعة (اختياري)", "Group in Arabic": "المجموعة بالعربية", "Label inside the group": "الاسم داخل المجموعة",
  "Label in Arabic": "الاسم داخل المجموعة بالعربية", "e.g. Shower Gel": "مثال: Shower Gel", "e.g. 500 ml": "مثال: 500 ml",
  "Sub-category deleted": "تم حذف الفئة الفرعية",
  "Delete “{name}”? Its {n} products stay but lose their sub-category until you move them.": "حذف «{name}»؟ تبقى منتجاتها الـ{n} لكن بدون فئة فرعية حتى تنقلها.",
  "Delete “{name}”?": "حذف «{name}»؟",
  // discounts
  Running: "سارٍ", Scheduled: "مجدول", Ended: "منتهٍ",
  "{r} running now · {s} scheduled": "{r} سارٍ الآن · {s} مجدول", "+ Add discount": "+ إضافة خصم", Off: "الخصم", From: "من", Until: "حتى",
  "was {m}": "كان {m}", "No discounts yet": "لا توجد خصومات بعد", "Add one to put products on sale for a period.": "أضف خصمًا لعرض منتجات بسعر مخفض لفترة.",
  "Edit discount": "تعديل الخصم", "Add discount": "إضافة خصم", "{n} chosen": "تم اختيار {n}", "Search products…": "ابحث عن المنتجات…",
  "no price": "بدون سعر", hidden: "مخفي", "Discount (%)": "الخصم (%)", Starts: "يبدأ", Ends: "ينتهي",
  "Prices round up to whole pounds, as on the website.": "تُقرَّب الأسعار لأعلى إلى جنيه كامل، كما في الموقع.",
  "Delete this discount? The product goes back to its normal price.": "حذف هذا الخصم؟ يعود المنتج إلى سعره العادي.",
  "Discount deleted": "تم حذف الخصم", "The end must be after the start.": "يجب أن تكون النهاية بعد البداية.",
  "Choose at least one product.": "اختر منتجًا واحدًا على الأقل.",
  "Discount added to {n} product": "تمت إضافة الخصم إلى {n} منتج", "Discount added to {n} products": "تمت إضافة الخصم إلى {n} منتج",
  // delivery
  "Charged on every order at checkout. Payment is cash on delivery.": "تُضاف على كل طلب عند إتمامه. الدفع عند الاستلام.",
  "Delivery fee (EGP)": "رسوم التوصيل (ج.م)", "Free delivery for orders from (EGP)": "توصيل مجاني للطلبات من (ج.م)",
  "Empty = never free": "فارغ = لا يوجد توصيل مجاني", "Delivery settings saved": "تم حفظ إعدادات التوصيل",
  "To charge by weight, run the storefront's 20261106010000_weight_shipping.sql in Supabase once, then reload this page.":
    "للتحصيل حسب الوزن، شغّل ملف 20261106010000_weight_shipping.sql مرة واحدة في Supabase ثم أعد تحميل الصفحة.",
  "How delivery is charged": "طريقة حساب التوصيل", "Flat fee": "رسوم ثابتة", "Aramex · by weight": "أرامكس · حسب الوزن",
  "Copy these from your Aramex rate card. Each started kilo counts as a full kilo, as Aramex charges.":
    "انقلها من قائمة أسعار أرامكس. كل كيلو بدأ يُحسب كيلو كاملًا، كما تحاسب أرامكس.",
  "Price for the first kilos (EGP)": "سعر أول كيلوهات (ج.م)", "Kilos that price covers": "عدد الكيلوهات التي يشملها السعر",
  "Each extra kilo (EGP)": "كل كيلو إضافي (ج.م)", "Extra outside Greater Cairo (EGP)": "إضافة خارج القاهرة الكبرى (ج.م)",
  "Surcharge — fuel, VAT … (%)": "رسوم إضافية — وقود، ضريبة… (%)", "Packaging per order (g)": "وزن التغليف لكل طلب (جم)",
  "Weight of a product with none set (g)": "وزن المنتج إن لم يُحدَّد (جم)",
  "Greater Cairo: Cairo, Giza, New Cairo, 6th of October, Sheikh Zayed, Madinaty, El Shorouk. Each product's weight is set on its page in Products.":
    "القاهرة الكبرى: القاهرة، الجيزة، القاهرة الجديدة، 6 أكتوبر، الشيخ زايد، مدينتي، الشروق. وزن كل منتج يُحدَّد في صفحته في المنتجات.",
  "Shipping calculator": "حاسبة الشحن", "Parcel weight (kg)": "وزن الشحنة (كجم)", City: "المدينة", "Order value (EGP)": "قيمة الطلب (ج.م)",
  "Delivery fee": "رسوم التوصيل",
  "Uses the rates as typed, saved or not. Each order's weight and delivery fee are on its page in Orders.":
    "تستخدم الأسعار كما هي مكتوبة، محفوظة أم لا. وزن كل طلب ورسوم توصيله في صفحته في الطلبات.",
  "Free: the order is over {m}.": "مجاني: الطلب أكثر من {m}.", "Flat fee for every order.": "رسوم ثابتة لكل طلب.",
  "{kg} kg charged · {extra} extra kg · {zone}": "يُحسب {kg} كجم · {extra} كجم إضافي · {zone}",
  "Greater Cairo": "القاهرة الكبرى", "outside Greater Cairo": "خارج القاهرة الكبرى",
  "Weight with its bottle or jar (g)": "الوزن مع العبوة (جم)", "For delivery by weight": "لحساب التوصيل بالوزن",
  "{kg} kg parcel": "شحنة {kg} كجم",
};

/* Bolika's own pages and labels */
Object.assign(DICT, {
  Overview: "نظرة عامة", "Gift sets": "أطقم الهدايا", Team: "الفريق", Settings: "الإعدادات", Dashboard: "لوحة التحكم",
  "Sign in with your Bolika staff account.": "سجّل الدخول بحساب فريق بوليكا.",
  Admin: "المدير", "Inventory manager": "مسؤول المخزون", "Sales manager": "مسؤول المبيعات", "No access": "بدون صلاحية",
  "Awaiting payment": "بانتظار الدفع", Paid: "مدفوع", "Payment failed": "فشل الدفع", Refunded: "مسترد",
  App: "التطبيق", Website: "الموقع", Boutique: "الفرع", Out: "نفد",
  // overview
  "{m} paid": "{m} مدفوعة", "{n} item is low on stock": "{n} منتج مخزونه منخفض", "{n} items are low on stock": "{n} منتجات مخزونها منخفض",
  "Check stock →": "راجع المخزون ←", "Orders by channel": "الطلبات حسب القناة",
  // orders
  "Orders from the app and the website show up here.": "تظهر هنا الطلبات القادمة من التطبيق والموقع.",
  "Placed {d} · {c} · {m}": "تم الطلب {d} · {c} · {m}", "Cash on delivery": "الدفع عند الاستلام", "Gift set": "طقم هدايا",
  "Bolika Circle points": "نقاط دائرة بوليكا", "{n} points": "{n} نقطة", "Gift wrapping": "تغليف الهدية", Total: "الإجمالي", Discounts: "الخصومات",
  Payment: "الدفع", "Payment status": "حالة الدفع", "Paymob transaction": "رقم معاملة Paymob", "Save payment": "حفظ الدفع", "Payment saved": "تم حفظ الدفع",
  // products
  Category: "الفئة", "{n} low on stock": "{n} مخزونها منخفض", "Low stock": "مخزون منخفض", "Search name, shade, SKU": "ابحث بالاسم أو الدرجة أو الكود",
  "{n} out": "{n} نفد", "running low": "قارب على النفاد", "Short description": "وصف قصير", "Short description in Arabic": "وصف قصير بالعربية",
  Brand: "الماركة", SKU: "الكود", "Warn when stock is at or below": "نبّه عندما يصل المخزون إلى",
  "Bestseller — shown in “The coveted few” and badged in the app": "الأكثر مبيعًا — يظهر في «الأكثر طلبًا» بعلامة في التطبيق",
  "Shades and sizes": "الدرجات والأحجام", "+ Shade": "+ درجة", "+ Size": "+ حجم", Shade: "درجة", Swatch: "اللون", Remove: "إزالة",
  "Each option has its own stock. Leave an option's price empty to use the product price. When a product has options, its own stock above is not used.":
    "لكل خيار مخزونه الخاص. اترك سعر الخيار فارغًا ليُستخدم سعر المنتج. عندما يكون للمنتج خيارات، لا يُستخدم مخزونه أعلاه.",
  "A square photo on a plain background looks best in the app.": "الصورة المربعة على خلفية سادة تبدو أفضل في التطبيق.",
  // gift sets
  "{n} sets · {h} hidden": "{n} أطقم · {h} مخفي", "+ Add gift set": "+ إضافة طقم", "No products yet": "لا توجد منتجات بعد",
  "worth {m} · saves {s}": "قيمتها {m} · توفّر {s}", "No gift sets yet": "لا توجد أطقم بعد",
  "Put a few products in a Bolika box at one price.": "اجمع عدة منتجات في علبة بوليكا بسعر واحد.",
  "Choose a product…": "اختر منتجًا…", "Any option": "أي خيار", Quantity: "الكمية", "Edit gift set": "تعديل الطقم", "Add gift set": "إضافة طقم",
  "A portrait photo (4:5) of the set in its box.": "صورة طولية (4:5) للطقم في علبته.", "In the box": "داخل العلبة",
  "Set price (EGP)": "سعر الطقم (ج.م)", "Boxes in stock": "العلب المتوفرة", "Empty = as many as the products allow": "فارغ = حسب توفر المنتجات",
  "Bought separately: {m} — the set saves {s}.": "عند الشراء منفردة: {m} — الطقم يوفّر {s}.", "Bought separately: {m}.": "عند الشراء منفردة: {m}.",
  "Delete the gift set “{name}”? Past orders keep their copy of it.": "حذف الطقم «{name}»؟ تحتفظ الطلبات السابقة بنسختها منه.",
  "Gift set deleted": "تم حذف الطقم", "Add at least one product to the set.": "أضف منتجًا واحدًا على الأقل إلى الطقم.", "Gift set added": "تمت إضافة الطقم",
  // discounts
  "Add one to put products or gift sets on sale for a period.": "أضف خصمًا لعرض منتجات أو أطقم بسعر مخفض لفترة.",
  "Promo codes": "أكواد الخصم", "Typed at checkout for a percentage off the whole order.": "يُكتب عند الدفع لخصم نسبة من الطلب كله.",
  "+ Add promo code": "+ إضافة كود", Code: "الكود", "Minimum order": "الحد الأدنى للطلب", Used: "مرات الاستخدام", "No end": "بدون نهاية",
  "No promo codes yet": "لا توجد أكواد بعد", "Create one like BOLIKA10 for campaigns and influencers.": "أنشئ كودًا مثل BOLIKA10 للحملات والمؤثرين.",
  "Products and gift sets": "المنتجات والأطقم", "Sale prices round up to whole pounds, as in the app.": "تُقرَّب أسعار التخفيض لأعلى إلى جنيه كامل، كما في التطبيق.",
  "Delete this discount? It goes back to its normal price.": "حذف هذا الخصم؟ يعود إلى سعره العادي.",
  "Choose at least one product or gift set.": "اختر منتجًا أو طقمًا واحدًا على الأقل.",
  "Discount added to {n} item": "تمت إضافة الخصم إلى {n} عنصر", "Discount added to {n} items": "تمت إضافة الخصم إلى {n} عناصر",
  "Edit promo code": "تعديل الكود", "Add promo code": "إضافة كود", "Minimum order (EGP)": "الحد الأدنى للطلب (ج.م)",
  "How many times it can be used": "عدد مرات الاستخدام", "Empty = unlimited": "فارغ = غير محدود", "Active — accepted at checkout": "مفعّل — يُقبل عند الدفع",
  "Used {n} times so far.": "استُخدم {n} مرة حتى الآن.", "Delete the code {c}? It stops working at checkout straight away.": "حذف الكود {c}؟ سيتوقف عن العمل فورًا.",
  "Promo code deleted": "تم حذف الكود", "Promo code added": "تمت إضافة الكود",
  // team
  "{n} people can open the dashboard.": "{n} أشخاص يمكنهم فتح لوحة التحكم.", Role: "الدور", Since: "منذ", you: "أنت",
  "Remove access": "إزالة الصلاحية", "Give someone access": "امنح شخصًا صلاحية", "Their email": "بريده الإلكتروني", "Give access": "منح الصلاحية",
  "New to Bolika?": "عضو جديد في بوليكا؟",
  "The person needs an account first: create it in Supabase → Authentication → Users → Add user (with “Auto confirm”), then give it a role here. They sign in to this dashboard with that email and password.":
    "يحتاج الشخص إلى حساب أولًا: أنشئه من Supabase ← Authentication ← Users ← Add user (مع Auto confirm)، ثم امنحه دورًا هنا. يسجّل الدخول إلى لوحة التحكم بهذا البريد وكلمة المرور.",
  "Everything: overview, orders, products, gift sets, discounts, team and settings.": "كل شيء: النظرة العامة والطلبات والمنتجات والأطقم والخصومات والفريق والإعدادات.",
  "Products, prices and stock, gift sets, discounts and promo codes.": "المنتجات والأسعار والمخزون والأطقم والخصومات وأكواد الخصم.",
  "Orders: see them and update their status and payment.": "الطلبات: عرضها وتحديث حالتها والدفع.",
  "Access given": "تم منح الصلاحية", "Role changed": "تم تغيير الدور", "Access removed": "تمت إزالة الصلاحية",
  "Remove {e}'s access to the dashboard? Their account stays; they just can't open the dashboard.": "إزالة صلاحية {e}؟ يبقى الحساب لكن لا يمكنه فتح لوحة التحكم.",
  // settings
  "Used by checkout in the app and on the website.": "يُستخدم عند الدفع في التطبيق والموقع.", "Bolika Circle": "دائرة بوليكا",
  "Spend for 1 point (EGP)": "قيمة الشراء لكل نقطة (ج.م)", "Welcome points": "نقاط الترحيب", "Points per redemption": "نقاط كل استبدال", "…worth (EGP)": "…قيمتها (ج.م)",
  "Save settings": "حفظ الإعدادات", "Settings saved": "تم حفظ الإعدادات", "Every order pays {m} delivery.": "كل طلب يدفع {m} للتوصيل.",
  "{m} delivery, free from {f}.": "التوصيل {m}، ومجاني من {f}.",
  "A EGP 1,000 order earns {p} points. {r} points take {m} off an order (up to 30% of it).": "طلب بقيمة 1,000 ج.م يكسب {p} نقطة. كل {r} نقطة تخصم {m} من الطلب (حتى 30% منه).",
});
