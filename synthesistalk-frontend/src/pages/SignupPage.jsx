import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import { auth } from "../firebase";
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";

export default function SignupPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [generalMessage, setGeneralMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });

    if (e.target.name === "firstName") setNameError("");
    if (e.target.name === "email") setEmailError("");
    if (e.target.name === "password") setPasswordError("");
    if (e.target.name === "confirmPassword") setConfirmPasswordError("");

    setGeneralMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setNameError("");
    setEmailError("");
    setPasswordError("");
    setConfirmPasswordError("");
    setGeneralMessage("");

    let hasClientError = false;

    if (!formData.firstName.trim()) {
      setNameError("Please enter your full name.");
      hasClientError = true;
    }

    const emailValid = formData.email.includes("@") && formData.email.includes(".");
    if (!emailValid) {
      setEmailError("Please enter a valid email address.");
      hasClientError = true;
    }

    if (formData.password.length < 6) {
      setPasswordError("Password should be at least 6 characters.");
      hasClientError = true;
    }

    if (formData.password !== formData.confirmPassword) {
      setConfirmPasswordError("Passwords do not match.");
      hasClientError = true;
    }

    if (hasClientError) return;

    try {
      const methods = await fetchSignInMethodsForEmail(auth, formData.email);
      if (methods.length > 0) {
        setEmailError("An account with this email already exists.");
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      await updateProfile(userCredential.user, {
        displayName: formData.firstName,
      });

      setGeneralMessage("Signup successful! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (error) {
      const code = error.code;

      if (code === "auth/invalid-email") {
        setEmailError("Please enter a valid email address.");
      }
      if (code === "auth/email-already-in-use") {
        setEmailError("An account with this email already exists.");
      }
      if (code === "auth/weak-password") {
        setPasswordError("Password should be at least 6 characters.");
      }

      if (
        !["auth/invalid-email", "auth/email-already-in-use", "auth/weak-password"].includes(code)
      ) {
        setGeneralMessage("Signup failed. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#2c2c2c] flex items-center justify-center relative px-4 text-white">
      {/* Background logo */}
      <img
        src="/assets/logo.png"
        alt="Background Logo"
        className="absolute w-[900px] z-0"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
          filter: "brightness(0)",
        }}
      />

      <form onSubmit={handleSubmit} className="z-10 w-full max-w-sm space-y-4">
        {/* Full Name */}
        <div className="flex flex-col items-start w-full">
          <div className="flex items-center w-full bg-[#5A5A5A] px-6 py-3 rounded-md shadow-lg">
            <FiUser className="mr-3 text-white text-2xl" />
            <input
              type="text"
              name="firstName"
              placeholder="Full Name"
              value={formData.firstName}
              onChange={handleChange}
              className="bg-transparent outline-none w-full placeholder-white text-xl text-white"
              style={{ fontFamily: '"Abril Fatface", cursive' }}
              required
            />
          </div>
          {nameError && <p className="text-sm text-red-500 mt-1">{nameError}</p>}
        </div>

        {/* Email */}
        <div className="flex flex-col items-start w-full">
          <div className="flex items-center w-full bg-[#5A5A5A] px-6 py-3 rounded-md shadow-lg">
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

        {/* Password */}
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

        {/* Confirm Password */}
        <div className="flex flex-col items-start w-full">
          <div className="flex items-center w-full bg-[#5A5A5A] px-6 py-3 rounded-md shadow-lg">
            <FiLock className="mr-3 text-white text-2xl" />
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="bg-transparent outline-none w-full placeholder-white text-xl text-white"
              style={{ fontFamily: '"Abril Fatface", cursive' }}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="ml-2 text-white focus:outline-none"
            >
              {showConfirmPassword ? <FiEyeOff className="text-xl" /> : <FiEye className="text-xl" />}
            </button>
          </div>
          {confirmPasswordError && <p className="text-sm text-red-500 mt-1">{confirmPasswordError}</p>}
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

        {/* Submit Button — now matches login */}
        <div className="mt-8 flex justify-center">
          <button
            type="submit"
            className={`bg-[#5A5A5A] text-white py-3 w-full rounded-md shadow-lg text-xl ${
              !formData.firstName || !formData.email || !formData.password || !formData.confirmPassword
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
            disabled={
              !formData.firstName ||
              !formData.email ||
              !formData.password ||
              !formData.confirmPassword
            }
            style={{ fontFamily: '"Abril Fatface", cursive' }}
          >
            Create your account
          </button>
        </div>

        {/* Navigation to Login — blue text */}
        <p className="text-center text-sm mt-6" style={{ fontFamily: '"Abril Fatface", cursive' }}>
          Already have an account?{" "}
          <span
            className="text-blue-400 hover:underline cursor-pointer font-semibold"
            onClick={() => navigate("/login")}
          >
            Log in
          </span>
        </p>
      </form>
    </div>
  );
}
