import React from "react";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-800 text-white flex flex-col items-center justify-center px-4">
      {/* Logo and Title */}
      <div className="flex items-center mb-8">
        <img src="/assets/logo.png" alt="Logo" className="w-16 h-16 mr-4" />
        <div>
          <h1 className="text-4xl font-bold">Paper Mind</h1>
          <p className="text-lg text-gray-400 -mt-1">SynthesisTalk</p>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col space-y-4 w-full max-w-xs">
        <button
          onClick={() => navigate("/signup")}
          className="border border-gray-400 text-white py-2 rounded-md hover:bg-gray-700 transition"
        >
          Sign Up
        </button>
        <button
          onClick={() => navigate("/login")}
          className="border border-gray-400 text-white py-2 rounded-md hover:bg-gray-700 transition"
        >
          Log In
        </button>
      </div>

      {/* Footer tagline */}
      <p className="text-sm text-center text-gray-400 mt-10">
        Chat with Knowledge. Upload, Ask, Understand
      </p>
    </div>
  );
}
