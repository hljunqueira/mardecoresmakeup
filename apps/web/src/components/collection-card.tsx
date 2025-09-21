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
    <Card className={`group relative overflow-hidden rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105 animate-slide-up bg-white border ${className}`}>
      <Link href={`/colecao/${collection.id}`}>
        <img 
          src={collection.image || "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2"} 
          alt={collection.name}
          className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500" 
        />
      </Link>

      <div className="p-4">
        <Link href={`/colecao/${collection.id}`} className="block">
          <h3 className="text-lg font-semibold text-petrol-700 mb-2">{collection.name}</h3>
          {collection.description && (
            <p className="text-gray-600 mb-4 line-clamp-2">{collection.description}</p>
          )}
        </Link>
        <Link href={`/colecao/${collection.id}`}>
          <Button className="bg-gold-500 hover:bg-gold-600 text-white rounded-full font-semibold transition-colors duration-200">
            Explorar
          </Button>
        </Link>
      </div>
    </Card>
  );
}
