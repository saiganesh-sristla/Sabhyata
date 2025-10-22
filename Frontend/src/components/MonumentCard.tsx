import { Link } from "react-router-dom";
import { Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Monument } from "@/data/monuments";

interface MonumentCardProps {
  monument: Monument;
}

export const MonumentCard = ({ monument }: MonumentCardProps) => {
  const nextEvent = monument.upcomingEvents[0];

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 group">
      <div className="aspect-video overflow-hidden">
        <img
          src={monument.image}
          alt={monument.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <CardHeader className="pb-3">
        <h3 className="font-bold text-xl text-foreground">{monument.name}</h3>
        <div className="flex items-center text-muted-foreground">
          <MapPin className="w-4 h-4 mr-1" />
          <span className="text-sm">{monument.location}</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
          {monument.description}
        </p>
        
        {nextEvent && (
          <div className="mb-4 p-3 bg-heritage-cream rounded-lg border border-heritage-gold/20">
            <div className="flex items-center text-heritage-burgundy mb-1">
              <Calendar className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">Next Event</span>
            </div>
            <p className="text-sm text-foreground font-medium">{nextEvent.title}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(nextEvent.date).toLocaleDateString()} • {nextEvent.time}
            </p>
          </div>
        )}
        
        <Button asChild className="w-full bg-gradient-heritage hover:opacity-90 transition-opacity">
          <Link to={`/monument/${monument.id}`}>
            Explore Monument
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};