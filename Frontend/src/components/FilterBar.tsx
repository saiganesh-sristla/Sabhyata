import { useState } from "react";
import { Calendar, MapPin, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

interface FilterBarProps {
  onDateChange: (date: string) => void;
  onLocationChange: (location: string) => void;
  selectedDate: string;
  selectedLocation: string;
}

const locations = [
  "All Locations",
  "Delhi",
  "Agra, Uttar Pradesh", 
  "Mumbai, Maharashtra",
  "Jaipur, Rajasthan"
];

export const FilterBar = ({ 
  onDateChange, 
  onLocationChange, 
  selectedDate, 
  selectedLocation 
}: FilterBarProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Filters</h3>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="md:hidden"
          >
            {isExpanded ? "Hide" : "Show"} Filters
          </Button>
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${!isExpanded ? 'hidden md:grid' : 'grid'}`}>
          {/* Date Filter */}
          <div className="space-y-2">
            <Label htmlFor="date-filter" className="flex items-center text-sm font-medium">
              <Calendar className="w-4 h-4 mr-2" />
              Date
            </Label>
            <Input
              id="date-filter"
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Location Filter */}
          <div className="space-y-2">
            <Label className="flex items-center text-sm font-medium">
              <MapPin className="w-4 h-4 mr-2" />
              Location
            </Label>
            <Select value={selectedLocation} onValueChange={onLocationChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border">
                {locations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters */}
          <div className="space-y-2">
            <Label className="text-sm font-medium invisible">Actions</Label>
            <Button 
              variant="outline" 
              onClick={() => {
                onDateChange("");
                onLocationChange("All Locations");
              }}
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};