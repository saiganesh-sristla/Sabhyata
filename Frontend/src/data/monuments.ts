export interface Monument {
  id: string;
  name: string;
  location: string;
  description: string;
  image: string;
  upcomingEvents: Event[];
}

export interface Event {
  id: string;
  monumentId: string;
  title: string;
  description: string;
  date: string;
  time: string;
  price: number;
  image: string;
  duration: string;
  language: string;
  venue: string;
  isSpecial?: boolean;
}

export const monuments: Monument[] = [
  {
    id: "jai-hind",
    name: "Jai Hind",
    location: "Red Fort, Delhi",
    description: "Experience the magnificent journey through India's rich history from the 17th century till Independence at the iconic Red Fort.",
    image: "/api/placeholder/800/400",
    upcomingEvents: [
      {
        id: "jai-hind-exp",
        monumentId: "jai-hind",
        title: "Jai Hind - Independence Journey",
        description: "Experience the magnificent journey through India's rich history from the 17th century till Independence at the iconic Red Fort. This spectacular sound and light show brings alive the tales of valor, sacrifice, and triumph that shaped our nation.",
        date: "2025-01-15",
        time: "7:15 PM",
        price: 199,
        image: "/api/placeholder/800/600",
        duration: "1 Hour",
        language: "Hindi",
        venue: "Red Fort, Delhi",
        isSpecial: true
      }
    ]
  },
  {
    id: "taj-mahal",
    name: "Taj Mahal",
    location: "Agra, Uttar Pradesh",
    description: "The epitome of love and architectural marvel, a UNESCO World Heritage Site.",
    image: "/api/placeholder/800/400",
    upcomingEvents: [
      {
        id: "taj-moonlight",
        monumentId: "taj-mahal",
        title: "Moonlight Tour of Taj Mahal",
        description: "Experience the ethereal beauty of Taj Mahal under the moonlight in this exclusive guided tour.",
        date: "2025-01-20",
        time: "8:00 PM",
        price: 750,
        image: "/api/placeholder/800/600",
        duration: "2 Hours",
        language: "English",
        venue: "Taj Mahal, Agra"
      }
    ]
  },
  {
    id: "gateway-of-india",
    name: "Gateway of India",
    location: "Mumbai, Maharashtra",
    description: "Historic archway built during the British colonial period, overlooking the Arabian Sea.",
    image: "/api/placeholder/800/400",
    upcomingEvents: [
      {
        id: "heritage-walk",
        monumentId: "gateway-of-india",
        title: "Colonial Heritage Walk",
        description: "Discover the colonial history of Mumbai through this immersive heritage walk starting from Gateway of India.",
        date: "2025-01-25",
        time: "6:00 AM",
        price: 250,
        image: "/api/placeholder/800/600",
        duration: "3 Hours",
        language: "English",
        venue: "Gateway of India, Mumbai"
      }
    ]
  },
  {
    id: "hawa-mahal",
    name: "Hawa Mahal",
    location: "Jaipur, Rajasthan",
    description: "The Palace of Winds, known for its unique five-story exterior resembling a honeycomb.",
    image: "/api/placeholder/800/400",
    upcomingEvents: [
      {
        id: "royal-evening",
        monumentId: "hawa-mahal",
        title: "Royal Evening at Hawa Mahal",
        description: "Step back in time and experience the royal grandeur of Rajasthan with traditional music and dance performances.",
        date: "2025-02-01",
        time: "6:30 PM",
        price: 450,
        image: "/api/placeholder/800/600",
        duration: "2.5 Hours",
        language: "Hindi",
        venue: "Hawa Mahal, Jaipur"
      }
    ]
  }
];

export const getAllEvents = (): Event[] => {
  return monuments.flatMap(monument => monument.upcomingEvents);
};

export const getMonumentById = (id: string): Monument | undefined => {
  return monuments.find(monument => monument.id === id);
};

export const getEventById = (id: string): Event | undefined => {
  return getAllEvents().find(event => event.id === id);
};