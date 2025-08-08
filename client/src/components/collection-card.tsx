import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Collection } from "@shared/schema";
import { Link } from "wouter";

interface CollectionCardProps {
  collection: Collection;
  className?: string;
}

export default function CollectionCard({ collection, className = "" }: CollectionCardProps) {
  return (
    <Card className={`group relative overflow-hidden rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105 animate-slide-up ${className}`}>
      <Link href={`/colecao/${collection.id}`}>
        <a>
          <img 
            src={collection.image || "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2"} 
            alt={collection.name}
            className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500" 
          />
        </a>
      </Link>
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
      
      <div className="absolute bottom-6 left-6 text-white">
        <h3 className="text-2xl font-bold mb-2">{collection.name}</h3>
        <p className="text-white/90 mb-4 max-w-xs">{collection.description}</p>
        <Link href={`/colecao/${collection.id}`}>
          <Button className="bg-gold-500 hover:bg-gold-600 text-white rounded-full font-semibold transition-colors duration-200">
            Explorar
          </Button>
        </Link>
      </div>
    </Card>
  );
}
