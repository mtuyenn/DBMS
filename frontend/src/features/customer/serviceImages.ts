import water from "./assets/minibar-water.jpg";
import juice from "./assets/minibar-juice.jpg";
import beer from "./assets/minibar-beer.jpg";
import cashews from "./assets/minibar-cashews.jpg";
import placeholder from "./assets/service-placeholder.svg";

const demoImages: Record<string, string> = {
  OPSWATER: water,
  OPSJUICE: juice,
  OPSBEER: beer,
  OPSSNACK: cashews,
  BREAKFAST: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=1000&h=700&fit=crop&auto=format",
  LAUNDRY: "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?w=1000&h=700&fit=crop&auto=format",
  EXTRABED: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=1000&h=700&fit=crop&auto=format",
  DINNER: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1000&h=700&fit=crop&auto=format",
  SPA60: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1000&h=700&fit=crop&auto=format",
  SPA30: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1000&h=700&fit=crop&auto=format",
  AIRPORT: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1000&h=700&fit=crop&auto=format",
  SHUTTLE: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1000&h=700&fit=crop&auto=format",
  POOL: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=1000&h=700&fit=crop&auto=format",
  MEETING: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1000&h=700&fit=crop&auto=format",
};

/** Demo photos for catalog services whose database records do not store images. */
export const serviceImageSource = (serviceId: string, imageUrl: string | null) =>
  imageUrl?.trim() || demoImages[serviceId] || placeholder;

export const serviceImagePlaceholder = placeholder;
