import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Authentication from '../components/Authentication';
import { getBaseUrl } from '../utils/baseUrl';
import '../styles/index.css';

export default function Landing() {
  const [backgroundStyle, setBackgroundStyle] = useState({});

  useEffect(() => {
    setTimeout(() => {
      setBackgroundStyle({
        backgroundImage: `url(${getBaseUrl('/static/img/shadesails.jpg')})`,
      });
    }, 100);
  }, []);

  return (
    <div
      style={{
        margin: 0,
        padding: 0,
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        transition: 'background-image 0.3s ease-in-out',
        ...backgroundStyle,
      }}
    >
      <Authentication />

      <div className="mt-6 bg-white dark:bg-gray-900 rounded-[20px] p-8 w-80 flex flex-col items-center gap-4 shadow-lg">
        <Link to="/copelands/discrepancy">
          <button className="buttonStyle">
            Open Discrepancy Calculator
          </button>
        </Link>
        <Link to="/copelands/rectangles">
          <button className="buttonStyle">
            Open Rectangle Nesting Tool
          </button>
        </Link>
      </div>
    </div>
  );
}
