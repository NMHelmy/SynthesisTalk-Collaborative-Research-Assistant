import React from "react";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  return (

    <div className="min-h-screen bg-[#2c2c2c] text-white flex flex-col items-center justify-center">

      {/* Logo and Title Section */}
      <div className="flex items-center justify-center mb-12">
        <img
          src="/assets/logo.png"
          alt="Logo"
          className="w-50 h-64 mr-6"
        />

        <div className="flex flex-col" style={{ fontFamily: '"Abril Fatface", cursive' }}>
          <h1 className="text-8xl leading-none">Paper Mind</h1>
          <p className="text-3xl mt-2 self-end">SynthesisTalk....</p>

        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col space-y-6 w-full max-w-[200px]">
        <button
          onClick={() => navigate("/signup")}

          className="border-4 border-white py-5 rounded-md text-2xl hover:bg-gray-600 transition"
          style={{ fontFamily: '"Abril Fatface", cursive' }}

        >
          Sign Up
        </button>
        <button
          onClick={() => navigate("/login")}

          className="border-4 border-white py-5 rounded-md text-2xl hover:bg-gray-600 transition"
          style={{ fontFamily: '"Abril Fatface", cursive' }}

        >
          Log In
        </button>
      </div>

      {/* Footer */}
      <p
        className="mt-16 text-4xl text-center"
        style={{ fontFamily: '"Abril Fatface", cursive' }}
      >

        Chat with Knowledge. Upload, Ask, Understand
      </p>
    </div>
  );
}