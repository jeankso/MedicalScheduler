import { useState, useEffect } from 'react';

export function useMobileDetection() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent;
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      const screenWidth = window.innerWidth;
      
      // Check both user agent and screen width
      const isMobileDevice = mobileRegex.test(userAgent) || screenWidth <= 768;
      setIsMobile(isMobileDevice);
    };

    // Check on mount
    checkMobile();

    // Add resize listener for responsive behavior
    window.addEventListener('resize', checkMobile);

    // Cleanup
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  return isMobile;
}