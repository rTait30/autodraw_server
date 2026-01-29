import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Authentication from '../components/Authentication';
import CollapsibleCard from '../components/CollapsibleCard';
import { getBaseUrl } from '../utils/baseUrl';
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
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: -1,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transition: 'background-image 0.3s ease-in-out',
          ...backgroundStyle,
        }}
      />
      
      <div className="absolute inset-0 w-full h-full overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-center p-5">
          <div className="w-full flex justify-center px-4">
            <CollapsibleCard 
                title="Sign In / Register" 
                defaultOpen={true}
                className="w-full max-w-xs !rounded-2xl !shadow-lg border-opacity-50"
                contentClassName="bg-white dark:bg-gray-800"
            >
              <Authentication />
            </CollapsibleCard>
          </div>

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
      </div>
    </>
  );
}
