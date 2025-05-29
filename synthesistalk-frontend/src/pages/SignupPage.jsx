// src/pages/SignupPage.jsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import { auth } from "../firebase";

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

    // Reset all error messages
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

      // Display all possible applicable Firebase errors
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
      <img
        src="/assets/logo.png"
        alt="Background Logo"
        className="absolute inset-0 w-full h-full object-cover z-0"
      />

      <form onSubmit={handleSubmit} className="z-10 w-full max-w-sm">
        <div className="flex flex-col space-y-4">
          <input
            type="text"
            name="firstName"
            placeholder="Full Name"
            value={formData.firstName}
            onChange={handleChange}
            className="w-70 bg-gray-400 text-white font-bold px-4 py-2 rounded-md placeholder-white focus:outline-none"
          />
          {nameError && <p className="text-sm text-red-500">{nameError}</p>}

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="bg-gray-400 text-white font-bold px-4 py-2 rounded-md placeholder-white focus:outline-none"
          />
          {emailError && <p className="text-sm text-red-500">{emailError}</p>}

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="bg-gray-400 text-white font-bold px-4 py-2 rounded-md placeholder-white focus:outline-none"
          />
          {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}

          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="bg-gray-400 text-white font-bold px-4 py-2 rounded-md placeholder-white focus:outline-none"
          />
          {confirmPasswordError && <p className="text-sm text-red-500">{confirmPasswordError}</p>}
        </div>

        {generalMessage && (
          <p
            className={`text-sm mt-4 ${
              generalMessage.toLowerCase().includes("success") ? "" : "text-red-500"
            }`}
          >
            {generalMessage}
          </p>
        )}

        <div className="mt-12 flex justify-center">
          <button
            type="submit"
            className="bg-gray-400 text-white font-bold py-2 px-6 rounded-md hover:bg-gray-500 transition"
          >
            Create your account
          </button>
        </div>

        <p className="text-center text-sm mt-6">
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
