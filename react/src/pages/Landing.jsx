import { useEffect, useState } from 'react';
import Authentication from '../components/Authentication';
import CollapsibleCard from '../components/CollapsibleCard';
import ToolsCard from '../components/ToolsCard';
import LegalCard from '../components/LegalCard';
import { getBaseUrl } from '../utils/baseUrl';

export default function Landing() {
  // Start invisible (opacity 0) to ensure content loads first
  const [backgroundStyle, setBackgroundStyle] = useState({ opacity: 0 });

  useEffect(() => {
    const loadBackground = () => {
      const imgUrl = getBaseUrl('/static/img/shadesails2.webp');
      const img = new Image();
      img.src = imgUrl; 
      
      // Once fully downloaded, display it
      img.onload = () => {
        setBackgroundStyle({
          backgroundImage: `url(${imgUrl})`,
          opacity: 1,
        });
      };
    };

    // Use requestIdleCallback to ensure we don't compete with initial interactivity/hydration
    // This pushes the image download to the lowest priority (idle time)
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(loadBackground, { timeout: 4000 });
    } else {
      setTimeout(loadBackground, 1500);
    }
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
          ...backgroundStyle,
        }}
      />
      
      <div className="absolute inset-0 w-full h-full overflow-y-auto">
        <div className="min-h-full flex flex-col items-center p-5">
          <div className="w-full flex flex-col items-center my-auto">
            <div className="w-full flex justify-center px-4">
              <CollapsibleCard 
                  title="Sign In / Register" 
                  defaultOpen={true}
                  className="w-full max-w-xs !shadow-lg border-opacity-50"
                  contentClassName="bg-white dark:bg-gray-800"
              >
                <Authentication />
              </CollapsibleCard>
            </div>

            <div className="mt-6 w-full flex justify-center px-4">
              <ToolsCard 
                  defaultOpen={false}
                  className="w-full max-w-xs !shadow-lg border-opacity-50"
              />
            </div>

            <div className="mt-6 w-full flex justify-center px-4">
              <LegalCard 
                  className="w-full max-w-xs !shadow-lg border-opacity-50"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
