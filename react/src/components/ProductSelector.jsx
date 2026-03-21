import React from "react";

import { Button } from './UI';

export default function ProductSelector({
  products = [],
  onSelect,
  onClose,
}) {
  return (
    <div className="p-6 flex flex-col gap-4">

      <div className="flex flex-col gap-3">
        {products.length > 0 ? (
          products.map((product) => (
            <Button
              key={product.id || product.name}
              onClick={() => onSelect(product)}
              className="w-full text-center text-lg py-3 shadow-sm"
            >
              {product.name}
            </Button>
          ))
        ) : (
          <div className="text-center text-gray-500 py-4">
            Loading products...
          </div>
        )}
      </div>
    </div>
  );
}