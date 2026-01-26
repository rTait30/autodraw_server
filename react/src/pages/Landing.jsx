import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Authentication from '../components/Authentication';
import CollapsibleCard from '../components/CollapsibleCard';
import { getBaseUrl } from '../utils/baseUrl';
import '../styles/index.css';
import { Button } from '../components/UI';

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
        padding: '20px',
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflowY: 'auto',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        transition: 'background-image 0.3s ease-in-out',
        ...backgroundStyle,
      }}
    >
      <Authentication />

      <div className="mt-6 w-full flex justify-center px-4">
        <CollapsibleCard 
            title="Tools" 
            defaultOpen={false}
            className="w-full max-w-xs !rounded-2xl !shadow-lg border-opacity-50"
            contentClassName="p-4 flex flex-col gap-4 bg-white dark:bg-gray-800"
        >
            <Link to="/copelands/discrepancy" className="w-full">
            <Button className="w-full" >
                Discrepancy Calculator
            </Button>
            </Link>
            <Link to="/copelands/rectangles" className="w-full">
            <Button className="w-full">
                Rectangle Nesting Tool
            </Button>
            </Link>
        </CollapsibleCard>
      </div>
      
    </div>
  );
}
