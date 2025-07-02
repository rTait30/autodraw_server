import React, { useEffect, useState } from 'react';
import { getBaseUrl } from '../utils/baseUrl';

export default function PriceList() {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(getBaseUrl('/api/pricelist'))
      .then(res => res.json())
      .then(data => {
        setPrices(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch price list:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading prices...</p>;

  return (
    <div style={{ padding: "1rem" }}>
      <h1>Price List</h1>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>ID</th>
            <th style={th}>SKU</th>
            <th style={th}>Name</th>
            <th style={th}>Description</th>
            <th style={th}>Price</th>
            <th style={th}>Unit</th>
            <th style={th}>Active</th>
            <th style={th}>Created</th>
            <th style={th}>Updated</th>
          </tr>
        </thead>
        <tbody>
          {prices.map(product => (
            <tr key={product.id}>
              <td style={td}>{product.id}</td>
              <td style={td}>{product.sku}</td>
              <td style={td}>{product.name}</td>
              <td style={td}>{product.description || ""}</td>
              <td style={td}>{product.price}</td>
              <td style={td}>{product.unit || ""}</td>
              <td style={td}>{product.active ? "Yes" : "No"}</td>
              <td style={td}>{formatDate(product.created_at)}</td>
              <td style={td}>{formatDate(product.updated_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th = {
  textAlign: "left",
  padding: "0.5rem",
  borderBottom: "2px solid #ccc",
  backgroundColor: "#f0f0f0"
};

const td = {
  padding: "0.5rem",
  borderBottom: "1px solid #ddd"
};

function formatDate(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString();
}
