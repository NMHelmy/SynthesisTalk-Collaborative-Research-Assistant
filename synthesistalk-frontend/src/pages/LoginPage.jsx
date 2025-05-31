import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../firebase";

export default function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [generalMessage, setGeneralMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (e.target.name === "email") setEmailError("");
    if (e.target.name === "password") setPasswordError("");
    setGeneralMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEmailError("");
    setPasswordError("");
    setGeneralMessage("");

    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      setGeneralMessage("Login successful. Redirecting...");
      setTimeout(() => navigate("/chat"), 1000);
    } catch (error) {
      const code = error.code;
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

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setEmailError("Please enter your email to reset password.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, formData.email);
      setGeneralMessage("Password reset email sent.");
    } catch (error) {
      const code = error.code;
      if (code === "auth/invalid-email") {
        setEmailError("Invalid email format.");
      } else if (code === "auth/user-not-found") {
        setEmailError("No user found with this email.");
      } else {
        setGeneralMessage("Failed to send reset email. Try again.");
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#2c2c2c] text-white relative overflow-hidden">
      {/* Background logo */}
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

      <h1 className="text-5xl mb-8 z-10" style={{ fontFamily: '"Abril Fatface", cursive' }}>
        Welcome back!
      </h1>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 z-10">
        {/* Email input */}
        <div className="flex flex-col items-start w-full">
          <div className="flex items-center w-full bg-[#5A5A5A] text-black px-6 py-3 rounded-md shadow-lg">
            <FiMail className="mr-3 text-white text-2xl" />
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              className="bg-transparent outline-none w-full placeholder-white text-xl text-white"
              style={{ fontFamily: '"Abril Fatface", cursive' }}
              required
            />
          </div>
          {emailError && <p className="text-sm text-red-500 mt-1">{emailError}</p>}
        </div>

        {/* Password input */}
        <div className="flex flex-col items-start w-full">
          <div className="flex items-center w-full bg-[#5A5A5A] px-6 py-3 rounded-md shadow-lg">
            <FiLock className="mr-3 text-white text-2xl" />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className="bg-transparent outline-none w-full placeholder-white text-xl text-white"
              style={{ fontFamily: '"Abril Fatface", cursive' }}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="ml-2 text-white focus:outline-none"
            >
              {showPassword ? <FiEyeOff className="text-xl" /> : <FiEye className="text-xl" />}
            </button>
          </div>
          {passwordError && <p className="text-sm text-red-500 mt-1">{passwordError}</p>}
        </div>

        {/* General Message */}
        {generalMessage && (
          <p
            className={`text-sm mt-1 ${
              generalMessage.toLowerCase().includes("success") ? "" : "text-red-500"
            }`}
          >
            {generalMessage}
          </p>
        )}

        {/* Login button */}
        <button
          type="submit"
          className={`bg-[#5A5A5A] text-white py-3 w-full rounded-md shadow-lg text-xl ${
            !formData.email || !formData.password ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={!formData.email || !formData.password}
          style={{ fontFamily: '"Abril Fatface", cursive' }}
        >
          Log In
        </button>
      </form>

      {/* Footer links */}
      <div
        className="mt-6 text-center text-white text-sm space-y-1 z-10"
        style={{ fontFamily: '"Abril Fatface", cursive' }}
      >
        <p
          className="text-blue-400 hover:underline cursor-pointer font-semibold"
          onClick={handleForgotPassword}
        >
          Forgot Password?
        </p>
        <p>
          Don't have an account?{" "}
          <span
            className="text-blue-400 underline cursor-pointer font-semibold"
            onClick={() => navigate("/signup")}
          >
            Sign up
          </span>
        </p>
      </div>
    </div>
  );
}