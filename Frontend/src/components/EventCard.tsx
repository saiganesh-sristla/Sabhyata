import { Link } from "react-router-dom";
import { Calendar, Clock, MapPin, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Event } from "@/data/monuments";

interface EventCardProps {
  event: Event;
}

export const EventCard = ({ event }: EventCardProps) => {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 group">
      <div className="aspect-video overflow-hidden">
        <img
          src={event.image}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <CardHeader className="pb-3">
        <h3 className="font-bold text-lg text-foreground line-clamp-1">{event.title}</h3>
        <div className="space-y-1">
          <div className="flex items-center text-muted-foreground text-sm">
            <MapPin className="w-4 h-4 mr-1" />
            <span>{event.venue}</span>
          </div>
          <div className="flex items-center text-muted-foreground text-sm">
            <Calendar className="w-4 h-4 mr-1" />
            <span>{new Date(event.date).toLocaleDateString()}</span>
            <Clock className="w-4 h-4 ml-3 mr-1" />
            <span>{event.time}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
          {event.description}
        </p>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center text-heritage-burgundy font-bold">
            <IndianRupee className="w-4 h-4 mr-1" />
            <span className="text-lg">{event.price}</span>
            <span className="text-sm font-normal text-muted-foreground ml-1">onwards</span>
          </div>
          <span className="text-sm text-muted-foreground">{event.duration}</span>
        </div>
        
        <Button asChild className="w-full bg-gradient-heritage hover:opacity-90 transition-opacity">
          <Link to={`/experience/${event.id}`}>
            Book Now
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};