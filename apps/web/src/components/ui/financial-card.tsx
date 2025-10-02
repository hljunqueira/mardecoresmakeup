import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  DollarSign
} from "lucide-react";

interface FinancialCardProps {
  id: string;
  title: string;
  value: number;
  formattedValue: string;
  trend: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
    period: string;
  };
  color: 'green' | 'blue' | 'purple' | 'orange' | 'red';
  icon: string;
  description: string;
  actionButton?: {
    label: string;
    action: string;
  };
  onClick?: () => void;
}

const iconMap = {
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  DollarSign,
};

const colorClasses = {
  green: {
    card: 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:from-green-100 hover:to-emerald-100',
    icon: 'bg-green-100 text-green-600',
    value: 'text-green-700',
    trend: 'text-green-600',
    badge: 'bg-green-100 text-green-700 border-green-200'
  },
  blue: {
    card: 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 hover:from-blue-100 hover:to-cyan-100',
    icon: 'bg-blue-100 text-blue-600',
    value: 'text-blue-700',
    trend: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-700 border-blue-200'
  },
  purple: {
    card: 'bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200 hover:from-purple-100 hover:to-indigo-100',
    icon: 'bg-purple-100 text-purple-600',
    value: 'text-purple-700',
    trend: 'text-purple-600',
    badge: 'bg-purple-100 text-purple-700 border-purple-200'
  },
  orange: {
    card: 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 hover:from-orange-100 hover:to-amber-100',
    icon: 'bg-orange-100 text-orange-600',
    value: 'text-orange-700',
    trend: 'text-orange-600',
    badge: 'bg-orange-100 text-orange-700 border-orange-200'
  },
  red: {
    card: 'bg-gradient-to-br from-red-50 to-pink-50 border-red-200 hover:from-red-100 hover:to-pink-100',
    icon: 'bg-red-100 text-red-600',
    value: 'text-red-700',
    trend: 'text-red-600',
    badge: 'bg-red-100 text-red-700 border-red-200'
  }
};

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Activity
};

export function FinancialCard({ 
  id, 
  title, 
  value, 
  formattedValue, 
  trend, 
  color, 
  icon, 
  description, 
  actionButton,
  onClick 
}: FinancialCardProps) {
  const IconComponent = iconMap[icon as keyof typeof iconMap] || DollarSign;
  const TrendIcon = trendIcons[trend.direction];
  const colors = colorClasses[color];

  return (
    <Card 
      className={`${colors.card} transition-all duration-300 hover:shadow-lg backdrop-blur-sm cursor-pointer border-2`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-xl ${colors.icon}`}>
              <IconComponent className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className={`text-2xl font-bold ${colors.value}`}>
                {formattedValue}
              </p>
            </div>
          </div>
          
          {trend.percentage > 0 && (
            <Badge 
              variant="secondary" 
              className={`${colors.badge} flex items-center space-x-1`}
            >
              <TrendIcon className="h-3 w-3" />
              <span className="text-xs font-medium">
                {trend.percentage.toFixed(1)}%
              </span>
            </Badge>
          )}
        </div>
        
        <div className="mt-4">
          <p className="text-sm text-gray-500 mb-2">{description}</p>
          
          {trend.percentage > 0 && (
            <p className={`text-xs ${colors.trend} font-medium`}>
              {trend.direction === 'up' && '↗'} 
              {trend.direction === 'down' && '↘'} 
              {trend.direction === 'stable' && '→'} 
              {trend.period}
            </p>
          )}
        </div>
        
        {actionButton && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`w-full ${colors.trend} hover:bg-opacity-10`}
            >
              {actionButton.label}
              <ArrowUpRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}