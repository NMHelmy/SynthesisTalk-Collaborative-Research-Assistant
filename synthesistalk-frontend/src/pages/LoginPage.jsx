import React from "react";
import { FaEnvelope, FaLock } from "react-icons/fa";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#2c2c2c] text-white relative overflow-hidden">
      {/* Background image - Large, black, faded */}
      <img
        src="/assets/logo.png" // replace with your logo path
        alt="Background Logo"
        className="absolute w-[900px] "
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
          filter: "brightness(0)", // makes image fully black
        }}
      />

      <h1 className="text-5xl font-extrabold mb-8 z-10">Welcome back !</h1>

      <form className="w-full max-w-sm space-y-4 z-10">
        {/* Email input */}
        <div className="flex items-center bg-gray-300 text-black rounded-md px-4 py-3 shadow-lg">
          <FaEnvelope className="mr-3 text-white" />
          <input
            type="email"
            placeholder="Email or username"
            className="bg-transparent outline-none flex-1 placeholder-white font-semibold"
          />
        </div>

        {/* Password input */}
        <div className="flex items-center bg-gray-300 text-black rounded-md px-4 py-3 shadow-lg">
          <FaLock className="mr-3 text-white" />
          <input
            type="password"
            placeholder="Password"
            className="bg-transparent outline-none flex-1 placeholder-white font-semibold"
          />
        </div>

        {/* Login button */}
        <button
          type="submit"
          className="bg-gray-300 text-white font-bold py-3 w-full rounded-md shadow-lg"
        >
          Log In
        </button>
      </form>

      {/* Footer links */}
      <div className="mt-6 text-center text-white font-semibold text-sm space-y-1 z-10">
        <p>Forget Password?</p>
        <p>
          Don't have an account?{" "}
          <span className="underline cursor-pointer">Sign up</span>
        </p>
      </div>
    </div>
  );
}
