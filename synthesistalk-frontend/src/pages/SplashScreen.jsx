import React from "react";

export default function SplashScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#2c2c2c]">
      <img
        src="/assets/splash.png" // adjust path as needed
        alt="Paper Mind Logo"
        className="animate-grow w-1/2 max-w-[400px]"
      />
    </div>
  );
}
