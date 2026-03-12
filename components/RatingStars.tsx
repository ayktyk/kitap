import React from 'react';
import { Star } from 'lucide-react';

interface Props {
  rating: number;
  onChange?: (rating: number) => void;
  readOnly?: boolean;
  size?: number;
}

const RatingStars: React.FC<Props> = ({ rating, onChange, readOnly = false, size = 16 }) => {
  const stars = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <div className="flex flex-wrap items-center gap-0.5">
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onChange && onChange(star)}
          className={`transition-colors duration-200 ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
          title={`${star}/10`}
        >
          <Star
            size={size}
            className={`${
              star <= rating 
                ? 'fill-yellow-400 text-yellow-500' 
                : 'fill-gray-100 text-gray-300'
            }`}
          />
        </button>
      ))}
      <span className="ml-2 text-sm font-medium text-gray-600 w-8">{rating}/10</span>
    </div>
  );
};

export default RatingStars;