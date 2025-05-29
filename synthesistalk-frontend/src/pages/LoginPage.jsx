// src/pages/LoginPage.jsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiMail, FiLock } from "react-icons/fi";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

export default function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [generalMessage, setGeneralMessage] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear field-specific errors while typing
    if (e.target.name === "email") setEmailError("");
    if (e.target.name === "password") setPasswordError("");
    setGeneralMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Reset all error messages
    setEmailError("");
    setPasswordError("");
    setGeneralMessage("");

    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      setGeneralMessage("Login successful. Redirecting...");
      setTimeout(() => navigate("/chat"), 1000);
    } catch (error) {
      const code = error.code;

      // Multiple errors may apply
      if (code === "auth/invalid-email") {
        setEmailError("Please enter a valid email address.");
      }
      if (code === "auth/user-not-found") {
        setEmailError("No account found with this email.");
      }
      if (code === "auth/wrong-password") {
        setPasswordError("Incorrect password. Please try again.");
      }
      if (code === "auth/too-many-requests") {
        setGeneralMessage("Too many login attempts. Please try again later.");
      }
      if (
        ![
          "auth/invalid-email",
          "auth/user-not-found",
          "auth/wrong-password",
          "auth/too-many-requests",
        ].includes(code)
      ) {
        setGeneralMessage("Login failed. Please try again.");
      }
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center relative"
      style={{ backgroundImage: "url('/assets/logo.png')" }}
    >
      <div className="absolute inset-0 bg-gray-900 bg-opacity-70" />
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-center">
        <h2 className="text-5xl font-bold mb-10">Welcome back!</h2>
        <form onSubmit={handleSubmit} className="flex flex-col space-y-4 w-[300px]">
          
          {/* Email */}
          <div className="flex flex-col items-start w-full">
            <div className="flex items-center w-full bg-gray-300 bg-opacity-90 text-black px-3 py-2 rounded-md">
              <FiMail className="mr-2" />
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                className="bg-transparent outline-none w-full placeholder-black font-semibold"
                required
              />
            </div>
            {emailError && <p className="text-sm text-red-500 mt-1">{emailError}</p>}
          </div>

          {/* Password */}
          <div className="flex flex-col items-start w-full">
            <div className="flex items-center w-full bg-gray-300 bg-opacity-90 text-black px-3 py-2 rounded-md">
              <FiLock className="mr-2" />
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                className="bg-transparent outline-none w-full placeholder-black font-semibold"
                required
              />
            </div>
            {passwordError && <p className="text-sm text-red-500 mt-1">{passwordError}</p>}
          </div>

          {/* General message */}
          {generalMessage && (
            <p
              className={`text-sm mt-1 ${
                generalMessage.toLowerCase().includes("success") ? "" : "text-red-500"
              }`}
            >
              {generalMessage}
            </p>
          )}

          <button
            type="submit"
            className="bg-gray-300 text-black font-semibold py-2 rounded-md hover:bg-gray-400"
          >
            Sign in
          </button>

          <div className="text-sm text-white mt-4">
            <p
              className="hover:underline cursor-pointer"
              onClick={() => setGeneralMessage("Forgot Password?")}
            >
              Forgot Password?
            </p>
            <p>
              Don’t have an account?{" "}
              <span
                className="hover:underline cursor-pointer font-bold"
                onClick={() => navigate("/signup")}
              >
                Sign up
              </span>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
