import { FaEnvelope, FaLock } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import React, { useState } from "react";


export default function LoginPage() {
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    const email = e.target.email.value;
    const password = e.target.password.value;

    if (!email || !password) {
      alert("Please enter both email and password");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Save token or user info if needed
        localStorage.setItem("token", data.token);
        navigate("/chat"); // go to chat page
      } else {
        alert(data.message || "Invalid email or password");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Something went wrong. Try again.");
    }
};

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");


  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#2c2c2c] text-white relative overflow-hidden">
      {/* Background image - Large, black, faded */}
      <img
        src="/assets/logo.png"
        alt="Background Logo"
        className="absolute w-[900px]"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
          filter: "brightness(0)",
        }}
      />

      <h1 className="text-5xl mb-8 z-10"style={{ fontFamily: '"Abril Fatface", cursive' }}>Welcome back !</h1>

      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4 z-10">
        {/* Email input */}
        <div className="flex items-center bg-[#5A5A5A] text-black rounded-md px-9 py-3 shadow-lg">
          <FaEnvelope className="mr-3 text-white text-2xl" />
          <input
            name="email"
            type="email"
            placeholder="Email or username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-transparent outline-none flex-1 placeholder-white text-xl"
            style={{ fontFamily: '"Abril Fatface", cursive' }}
          />
        </div>

        {/* Password input */}
        <div className="flex items-center bg-[#5A5A5A] text-black rounded-md px-9 py-3 shadow-lg">
          <FaLock className="mr-3 text-white text-2xl" />
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-transparent outline-none flex-1 placeholder-white text-xl"
            style={{ fontFamily: '"Abril Fatface", cursive' }}
          />
        </div>

        {/* Login button */}
        <button
          type="submit"
          className={`bg-[#5A5A5A] text-white py-3 w-full rounded-md shadow-lg text-xl ${
    !email || !password ? "opacity-50 cursor-not-allowed" : ""
  }`}
          disabled={!email || !password}
          style={{ fontFamily: '"Abril Fatface", cursive' }}
        >
          Log In
        </button>
      </form>

      {/* Footer links */}
      <div className="mt-6 text-center text-white text-sm space-y-1 z-10"style={{ fontFamily: '"Abril Fatface", cursive' }}>
        <p>Forget Password?</p>
        <p>
          Don't have an account?{" "}
          <span
            className="underline cursor-pointer"
            onClick={() => navigate("/signup")}
          >
            Sign up
          </span>
        </p>
      </div>
    </div>
  );
}
