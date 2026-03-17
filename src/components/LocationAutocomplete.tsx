import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin } from "lucide-react";

// Comprehensive global places database
const PLACES: string[] = [
  // Countries
  "Afghanistan", "Albania", "Algeria", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahrain", "Bangladesh", "Belgium", "Bhutan", "Bolivia", "Bosnia", "Brazil", "Brunei", "Bulgaria",
  "Cambodia", "Cameroon", "Canada", "Chile", "China", "Colombia", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic",
  "Denmark", "Dominican Republic", "Dubai",
  "Ecuador", "Egypt", "El Salvador", "Estonia", "Ethiopia",
  "Fiji", "Finland", "France",
  "Georgia", "Germany", "Ghana", "Greece", "Guatemala",
  "Haiti", "Honduras", "Hong Kong", "Hungary",
  "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
  "Jamaica", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Libya", "Lithuania", "Luxembourg",
  "Macedonia", "Madagascar", "Malaysia", "Maldives", "Mali", "Malta", "Mexico", "Moldova", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
  "Namibia", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Nigeria", "North Korea", "Norway",
  "Oman",
  "Pakistan", "Palestine", "Panama", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar",
  "Romania", "Russia", "Rwanda",
  "Saudi Arabia", "Senegal", "Serbia", "Singapore", "Slovakia", "Slovenia", "Somalia", "South Africa", "South Korea", "Spain", "Sri Lanka", "Sudan", "Sweden", "Switzerland", "Syria",
  "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Trinidad", "Tunisia", "Turkey", "Turkmenistan",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
  "Venezuela", "Vietnam",
  "Yemen",
  "Zambia", "Zimbabwe",
  // Major cities
  "Abu Dhabi", "Accra", "Addis Ababa", "Ahmedabad", "Alexandria", "Algiers", "Amman", "Amsterdam", "Ankara", "Athens", "Atlanta", "Auckland",
  "Baghdad", "Baku", "Bali", "Baltimore", "Bangalore", "Bangkok", "Barcelona", "Beijing", "Beirut", "Belgrade", "Berlin", "Bogota", "Boston", "Brisbane", "Brussels", "Bucharest", "Budapest", "Buenos Aires",
  "Cairo", "Calgary", "Cape Town", "Caracas", "Casablanca", "Chennai", "Chicago", "Chittagong", "Colombo", "Copenhagen",
  "Dakar", "Dallas", "Damascus", "Dar es Salaam", "Delhi", "Denver", "Detroit", "Dhaka", "Doha", "Dubai", "Dublin", "Durban",
  "Edinburgh",
  "Florence", "Frankfurt",
  "Geneva", "Guangzhou", "Guayaquil",
  "Hamburg", "Hanoi", "Havana", "Helsinki", "Ho Chi Minh City", "Houston", "Hyderabad",
  "Islamabad", "Istanbul",
  "Jakarta", "Jeddah", "Jerusalem", "Johannesburg",
  "Kabul", "Karachi", "Kathmandu", "Khartoum", "Kiev", "Kolkata", "Kuala Lumpur", "Kuwait City",
  "Lagos", "Lahore", "Las Vegas", "Lima", "Lisbon", "London", "Los Angeles", "Luanda", "Lusaka",
  "Madrid", "Manila", "Marrakech", "Mecca", "Medina", "Melbourne", "Mexico City", "Miami", "Milan", "Minneapolis", "Minsk", "Mogadishu", "Monterrey", "Montreal", "Moscow", "Mumbai", "Munich", "Muscat",
  "Nairobi", "Nashville", "New Delhi", "New York", "Nicosia",
  "Osaka", "Oslo", "Ottawa",
  "Paris", "Perth", "Philadelphia", "Phoenix", "Portland", "Prague", "Pune",
  "Quito",
  "Rabat", "Rawalpindi", "Riyadh", "Rome", "Rotterdam",
  "San Diego", "San Francisco", "Santiago", "Sao Paulo", "Seattle", "Seoul", "Shanghai", "Shenzhen", "Singapore", "Sofia", "Stockholm", "Stuttgart", "Surabaya", "Sydney", "Sylhet",
  "Taipei", "Tallinn", "Tashkent", "Tehran", "Tel Aviv", "Thessaloniki", "Tirana", "Tokyo", "Toronto", "Tunis",
  "Vancouver", "Venice", "Vienna", "Vilnius",
  "Warsaw", "Washington DC",
  "Zagreb", "Zurich",
];

interface LocationAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

const LocationAutocomplete = ({ value, onChange, placeholder }: LocationAutocompleteProps) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filterSuggestions = useCallback((query: string) => {
    if (!query || query.length < 1) return [];
    const q = query.toLowerCase();
    return PLACES
      .filter(p => p.toLowerCase().startsWith(q))
      .slice(0, 8);
  }, []);

  useEffect(() => {
    const results = filterSuggestions(value);
    setSuggestions(results);
    setIsOpen(results.length > 0 && document.activeElement === inputRef.current);
    setActiveIndex(-1);
  }, [value, filterSuggestions]);

  const selectItem = (item: string) => {
    onChange(item);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectItem(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || "City or Country"}
        className="w-full h-12 pl-10 pr-4 rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
        required
        autoComplete="off"
      />
      {isOpen && suggestions.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border/50 rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto"
        >
          {suggestions.map((item, i) => (
            <li
              key={item}
              onMouseDown={() => selectItem(item)}
              className={`px-4 py-2.5 text-sm cursor-pointer flex items-center gap-2 transition-colors ${
                i === activeIndex ? "bg-primary/20 text-primary" : "text-foreground hover:bg-secondary"
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LocationAutocomplete;
