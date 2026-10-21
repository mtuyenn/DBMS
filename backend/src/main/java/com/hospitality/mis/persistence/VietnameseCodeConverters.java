package com.hospitality.mis.persistence;
import java.util.Map;
public final class VietnameseCodeConverters {
    private VietnameseCodeConverters() {}
    private static class CodeMapping {
        private final Map<String, String> toDatabase;
        private final Map<String, String> fromDatabase;

        protected CodeMapping(Map<String, String> values) {
            toDatabase = Map.copyOf(values);
            fromDatabase = values.entrySet().stream()
                    .collect(java.util.stream.Collectors.toUnmodifiableMap(Map.Entry::getValue, Map.Entry::getKey));
        }

        public String convertToDatabaseColumn(String value) {
            if (value == null) return null;
            String translated = toDatabase.get(value);
            if (translated == null) throw new IllegalArgumentException("Unsupported coded value: " + value);
            return translated;
        }

        public String convertToEntityAttribute(String value) {
            if (value == null) return null;
            String translated = fromDatabase.get(value);
            if (translated == null) throw new IllegalArgumentException("Unknown Vietnamese coded value: " + value);
            return translated;
        }
    }
    public static final class ServiceCategoryConverter {
        private final CodeMapping mapping = new CodeMapping(Map.ofEntries(
                Map.entry("business", "Dịch vụ doanh nghiệp"),
                Map.entry("fine-dining", "Nhà hàng cao cấp"),
                Map.entry("inroom", "Dịch vụ tại phòng"),
                Map.entry("laundry", "Giặt ủi"),
                Map.entry("other", "Khác"),
                Map.entry("recreation", "Giải trí"),
                Map.entry("room-amenity", "Vật dụng phòng"),
                Map.entry("spa", "Spa"),
                Map.entry("transport", "Đưa đón"),
                Map.entry("food", "Món ăn"),
                Map.entry("beverage", "Thức uống")));
        public String convertToDatabaseColumn(String value) { return mapping.convertToDatabaseColumn(value); }
        public String convertToEntityAttribute(String value) { return mapping.convertToEntityAttribute(value); }
    }
    public static final class ServiceUnitConverter {
        private static final Map<String, String> API_ALIASES = Map.ofEntries(
                Map.entry("BOTTLE", "chai"), Map.entry("CHAI", "chai"),
                Map.entry("UNIT", "đơn vị"), Map.entry("TIME", "lần"),
                Map.entry("LẦN", "lần"), Map.entry("set", "bộ"),
                Map.entry("SET", "bộ"), Map.entry("PCS", "cái"),
                Map.entry("piece", "cái"), Map.entry("Pack", "gói"),
                Map.entry("PACK", "gói"), Map.entry("Roll", "cuộn"),
                Map.entry("ROLL", "cuộn"));
        private static final java.util.Set<String> DATABASE_VALUES = java.util.Set.of(
                "bộ", "lần", "suất", "món", "đêm", "lượt", "chuyến", "khách",
                "khách/ngày", "giờ", "ngày", "chai", "lon", "ly", "kg", "đơn vị", "cái", "gói", "cuộn", "tuýp");

        public String convertToDatabaseColumn(String value) {
            if (value == null) return null;
            String translated = API_ALIASES.get(value);
            if (translated != null) return translated;
            if (DATABASE_VALUES.contains(value)) return value;
            throw new IllegalArgumentException("Unsupported service unit: " + value);
        }

        public String convertToEntityAttribute(String value) {
            if (value == null) return null;
            if (DATABASE_VALUES.contains(value)) return value;
            throw new IllegalArgumentException("Unknown Vietnamese service unit: " + value);
        }
    }
}
