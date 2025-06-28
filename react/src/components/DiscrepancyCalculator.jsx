import React from 'react';
import { useNavigate } from 'react-router-dom';

function DiscrepancyCalculator() {
  const navigate = useNavigate();

  return (
    <div
      className="calculator-box"
      style={{
        background: '#fff',
        borderRadius: 20,
        padding: '32px 40px',
        width: 320,
        boxShadow: '0 0 30px rgba(0,0,0,0.10)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginTop: 24,
      }}
    >
      <button
        onClick={() => navigate('/discrepancy')}
        className="calc-btn"
        style={{
          display: 'block',
          width: '100%',
          padding: '16px 0',
          backgroundColor: '#2f2f6f',
          color: '#fff',
          fontSize: 18,
          fontWeight: 600,
          borderRadius: 8,
          textDecoration: 'none',
          transition: 'background 0.2s',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Discrepancy Calculator
      </button>
    </div>
  );
}

export default DiscrepancyCalculator;
