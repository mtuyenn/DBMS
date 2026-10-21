import { useState, useEffect, useRef, useCallback } from "react";

import type { Room } from "../../shared/types/domain";
import { publicApi } from "../../shared/api/public";

import { MapPin, Wifi, Car, Dumbbell, ArrowLeft, Phone, Mail, Waves, Utensils } from "lucide-react";

// Customer-facing luxury hotel components
import { LuxuryHero } from "./components/LuxuryHero";
import { AmenitiesMosaic } from "./components/AmenitiesMosaic";
import { CuratedServicesSection } from "./components/CuratedServicesSection";
import { RoomCardSection } from "./components/RoomCardSection";
import { RoomDetailPage } from "./components/RoomDetailPage";
import { LuxuryFnBView, type FnbService } from "./components/LuxuryFnBView";
import { localDateValue } from "../../shared/utils/localDate";
import { CUSTOMER_ROOM_CATALOG } from "./roomCatalog";

import { serviceImageSource } from "./serviceImages";

interface CustomerPortalProps {
  onLogin: () => void;
  onLogout?: () => void;
  isAuthenticated: boolean;
}

const fmtVND = (n: number) => n.toLocaleString("vi-VN") + " ₫";
const dateInputValue = (offsetDays: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return localDateValue(date);
};

const serviceTagColor: Record<string, string> = {
  "fine-dining": "#8B5CF6", inroom: "#22C55E", spa: "#EC4899",
  transport: "#3B82F6", laundry: "#3B82F6", recreation: "#F97316", business: "#B8944A",
};

export default function CustomerPortal({ onLogin }: CustomerPortalProps) {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isDetailView, setIsDetailView] = useState(false);
  // Search Dates & Guests
  const [checkIn, setCheckIn] = useState(() => dateInputValue(1));
  const [checkOut, setCheckOut] = useState(() => dateInputValue(3));
  const [guests, setGuests] = useState(2);

  // Theo dõi mục điều hướng đang chọn khi cuộn
  const [activeNav, setActiveNav] = useState<"sanctuary" | "rooms" | "fnb">("sanctuary");

  // Portal tab
  const [portalView, setPortalView] = useState<"sanctuary" | "rooms" | "fnb">("sanctuary");
  const [fnbCategory, setFnbCategory] = useState("all");
  const [tableModal, setTableModal] = useState(false);
  const [selectedService, setSelectedService] = useState<FnbService | null>(null);

  // Bộ sưu tập phòng quảng bá là dữ liệu tĩnh của frontend, không phụ thuộc backend.
  const roomList = CUSTOMER_ROOM_CATALOG;

  const [serviceList, setServiceList] = useState<FnbService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);

  // References for smooth scrolling
  const roomsRef = useRef<HTMLDivElement>(null);
  const wellnessRef = useRef<HTMLDivElement>(null);

  // Scroll spy to switch underline when user scrolls to Accommodation section
  useEffect(() => {
    if (portalView === "fnb") {
      setActiveNav("fnb");
      return;
    }

    const handleScroll = () => {
      if (!roomsRef.current) return;
      const rect = roomsRef.current.getBoundingClientRect();
      // When accommodation section reaches top 45% of viewport
      if (rect.top <= window.innerHeight * 0.45) {
        setActiveNav("rooms");
      } else {
        setActiveNav("sanctuary");
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [portalView]);

  const fetchServices = useCallback(() => {
    setServicesLoading(true);
    setServicesError(null);
    publicApi.services(0, 100)
      .then(apiServices => {
        if (!Array.isArray(apiServices)) return;
        const mapped = apiServices.map((service): FnbService => {
          return {
            id: service.service_id,
            category: service.category,
            title: service.name,
            subtitle: service.unit ? `${service.name} · ${service.unit}` : service.name,
            price: service.price,
            unit: service.unit,
            durationMinutes:service.duration_minutes,
            desc: service.description ?? "",
            img: serviceImageSource(service.service_id, service.image_url),
            tag: service.price === 0 ? "Chưa niêm yết" : service.unit || "Dịch vụ",
            tagColor: serviceTagColor[service.category] ?? "#B8944A",
          };
        });
        setServiceList(mapped);
      })
      .catch(err => {
        console.warn("Backend public services query failed:", err);
        setServicesError("Không thể tải danh sách dịch vụ & trải nghiệm. Vui lòng thử lại.");
        setServiceList([]);
      })
      .finally(() => {
        setServicesLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleSearch = () => {
    if (!checkIn || !checkOut || new Date(checkIn) >= new Date(checkOut)) {
      window.alert("Ngày trả phòng phải sau ngày nhận phòng.");
      return;
    }
    roomsRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleOpenDetail = (room: Room) => {
    setSelectedRoom(room);
    setIsDetailView(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 2. Room Detail Page (Figure 5)
  if (isDetailView && selectedRoom) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        {/* Detail View Top Header */}
        <nav className="sticky top-0 z-40 px-6 py-4 flex items-center justify-between bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#E2DDD4]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDetailView(false)}
              className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#57534E] hover:text-[#1C1917] cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Trở về</span>
            </button>
            <div className="h-4 w-px bg-[#DDD6C8] hidden sm:block" />
            <div className="flex items-center gap-2">
              <img src="/hotel_logo.png" alt="MaM Hotel" className="w-7 h-auto object-contain" />
              <span className="font-display text-lg text-[#0D1117]">MaM Hotel</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a href="tel:19006789" className="px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#1C1917] hover:bg-[#8C6D37] text-white transition">
              Gọi lễ tân
            </a>
          </div>
        </nav>

        {/* Room Detail Page Component (Replicating Figure 5) */}
        <RoomDetailPage
          room={selectedRoom}
          onBack={() => setIsDetailView(false)}
        />
      </div>
    );
  }

  const navigateToFnbCategory = (category: string, itemId?: string) => {
    const targetCategory = category === "spa" ? "spa" : category === "business" ? "business" : "fine-dining";
    setFnbCategory(targetCategory);
    setActiveNav("fnb");
    setPortalView("fnb");

    const performScroll = () => {
      const tabsEl = document.getElementById("fnb-tabs");
      if (tabsEl) {
        const headerOffset = 73;
        const targetY = tabsEl.getBoundingClientRect().top + window.pageYOffset - headerOffset;
        window.scrollTo({ top: Math.max(0, targetY), behavior: "instant" });
      }
      if (itemId) {
        const itemEl = document.getElementById(itemId);
        if (itemEl) {
          itemEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }
    };

    requestAnimationFrame(performScroll);
    setTimeout(performScroll, 60);
  };

  // 3. Main Hotel Customer Portal
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1C1917] font-sans antialiased selection:bg-[#B8944A]/20">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 px-6 sm:px-10 py-4 flex items-center justify-between bg-[#FAF8F5]/85 backdrop-blur-xl border-b border-[#E7E2D6] transition-all">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setPortalView("sanctuary")}>
            <img src="/hotel_logo.png" alt="MaM Hotel Logo" className="w-8 h-auto object-contain drop-shadow" />
            <div>
              <span className="font-display text-xl leading-none text-[#0D1117] tracking-tight block">MaM Hotel</span>
              <span className="text-[10px] uppercase tracking-[0.25em] text-[#8C6D37] font-semibold block mt-0.5">Luxury Hotel &amp; Spa</span>
            </div>
          </div>
        </div>

        {/* Navigation items with dynamic scroll-spy underline */}
        <div className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-[0.2em]">
          <button
            onClick={() => {
              setPortalView("sanctuary");
              setActiveNav("sanctuary");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={`cursor-pointer transition pb-1 ${
              portalView !== "fnb" && activeNav === "sanctuary"
                ? "text-[#8C6D37] border-b-2 border-[#8C6D37]"
                : "text-[#57534E] hover:text-[#1C1917]"
            }`}
          >
            Khách sạn
          </button>
          <button
            onClick={() => {
              setPortalView("sanctuary");
              setActiveNav("rooms");
              roomsRef.current?.scrollIntoView({ behavior: "smooth" });
            }}
            className={`cursor-pointer transition pb-1 ${
              portalView !== "fnb" && activeNav === "rooms"
                ? "text-[#8C6D37] border-b-2 border-[#8C6D37]"
                : "text-[#57534E] hover:text-[#1C1917]"
            }`}
          >
            Phòng &amp; Suite
          </button>
          <button
            onClick={() => {
              setPortalView("fnb");
              setActiveNav("fnb");
            }}
            className={`cursor-pointer transition pb-1 ${
              portalView === "fnb"
                ? "text-[#8C6D37] border-b-2 border-[#8C6D37]"
                : "text-[#57534E] hover:text-[#1C1917]"
            }`}
          >
            Ẩm thực &amp; Tiện ích
          </button>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <button onClick={onLogin} className="px-5 py-2 rounded-full text-xs uppercase tracking-wider font-semibold bg-[#1C1917] hover:bg-[#8C6D37] text-white transition cursor-pointer">Đăng nhập nhân viên</button>
        </div>
      </header>

      {/* VIEW 1: FnB & Services */}
      {portalView === "fnb" && (
        <LuxuryFnBView
          fnbCategory={fnbCategory}
          setFnbCategory={setFnbCategory}
          tableModal={tableModal}
          setTableModal={setTableModal}
          services={serviceList}
          selectedService={selectedService}
          onSelectService={setSelectedService}
          loading={servicesLoading}
          error={servicesError}
          onRetry={fetchServices}
        />
      )}

      {/* VIEW 2: The Complete 5-Star Hotel Landing Flow */}
      {portalView === "sanctuary" && (
        <>
          {/* SECTION 1: High-Resolution Cinematic Hero with User's Video & Scroll Prompt */}
          <LuxuryHero
            onScrollToRooms={() => {
              document.getElementById("amenities")?.scrollIntoView({ behavior: "smooth" });
            }}
          />

          {/* SECTION 2: Hotel Amenities Mosaic / Layout (Figure 2 / Hình 2) */}
          <div id="amenities">
            <AmenitiesMosaic
              services={serviceList}
              onSelectCategory={(cat, itemId) => {
                if (cat === "rooms") {
                  roomsRef.current?.scrollIntoView({ behavior: "smooth" });
                } else if (cat === "fnb" || cat === "spa" || cat === "business") {
                  navigateToFnbCategory(cat, itemId);
                }
              }}
            />
          </div>

          {/* SECTION 3: Curated Mindful Services & Spa (Figure 3 / Hình 3) */}
          <div ref={wellnessRef} id="wellness">
            <CuratedServicesSection
              services={serviceList}
              advertisingOnly
              onBookSpa={() => navigateToFnbCategory("spa")}
              onExploreWellness={() => navigateToFnbCategory("spa")}
            />
          </div>

          {/* SECTION 4: Room Cards Showcase & Search Bar (Figure 4 / Hình 4) - NO PRICE DISPLAYED */}
          <div ref={roomsRef} id="accommodation">
            <RoomCardSection
              rooms={roomList}
              onViewDetail={handleOpenDetail}
              checkIn={checkIn}
              setCheckIn={setCheckIn}
              checkOut={checkOut}
              setCheckOut={setCheckOut}
              guests={guests}
              setGuests={setGuests}
              onSearch={handleSearch}
            />
          </div>
        </>
      )}

      {/* Features Strip */}
      <section className="py-16 px-4 bg-[#141A24] text-white border-t border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 sm:gap-8 text-center">
          {[
            [Wifi, "WiFi Toàn Khu", "Kết nối tốc độ cao không giới hạn"],
            [Car, "Đưa đón sân bay 24/7", "Dịch vụ xe sang đưa đón tận nơi"],
            [Waves, "Hồ bơi", "Hồ bơi vô cực ngắm trọn biển trời"],
            [Dumbbell, "Spa & Gym", "Trị liệu chuyên sâu & thể hình hiện đại"],
            [Utensils, "Ẩm Thực Cao Cấp", "Hương vị ẩm thực tinh hoa từ bếp trưởng"],
          ].map(([Icon, title, sub], i) => {
            const Ic = Icon as React.FC<{ size: number; className: string }>;
            return (
              <div key={i} className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-[#B8944A]/30 flex items-center justify-center mb-4 text-[#D4AF6E]">
                  <Ic size={22} className="text-[#D4AF6E]" />
                </div>
                <h4 className="text-sm font-medium text-white mb-1">{title as string}</h4>
                <p className="text-xs text-white/50">{sub as string}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-14 px-6 bg-[#0B0F17] text-white border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <img src="/hotel_logo.png" alt="MaM Hotel" className="w-10 h-auto object-contain drop-shadow" />
            <div>
              <p className="font-display text-xl text-white">MaM Hotel</p>
              <p className="text-xs text-[#D4AF6E] tracking-widest uppercase">Vũng Tàu, Việt Nam</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-white/60">
            <span className="flex items-center gap-1.5"><MapPin size={13} className="text-[#D4AF6E]" /> Số 1 VVN, Vũng Tàu</span>
            <span className="flex items-center gap-1.5"><Phone size={13} className="text-[#D4AF6E]" /> Hotline: 1900 6789</span>
            <a href="mailto:mam@hotel.com" className="flex items-center gap-1.5"><Mail size={13} className="text-[#D4AF6E]" /> mam@hotel.com</a>
          </div>

          <p className="text-xs text-white/40">
          © 2026 MaM Hotel · All Rights Reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
