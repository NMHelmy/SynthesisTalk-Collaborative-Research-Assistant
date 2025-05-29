import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SignupPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Add signup logic here (e.g., API call)
    console.log("Sign up with:", formData);
  };

  return (
    <div className="min-h-screen bg-gray-800 flex items-center justify-center relative px-4">
      <img
        src="/assets/logo-bg.png"
        alt="Background Logo"
        className="absolute inset-0 w-full h-full object-cover opacity-10"
      />

      <form
        onSubmit={handleSubmit}
        className="z-10 flex flex-col space-y-4 bg-transparent text-white w-full max-w-sm"
      >
        <input
          type="text"
          name="firstName"
          placeholder="First Name"
          value={formData.firstName}
          onChange={handleChange}
          className="bg-gray-500 text-white px-4 py-2 rounded-md placeholder-white focus:outline-none"
        />
        <input
          type="text"
          name="lastName"
          placeholder="Last Name"
          value={formData.lastName}
          onChange={handleChange}
          className="bg-gray-500 text-white px-4 py-2 rounded-md placeholder-white focus:outline-none"
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          className="bg-gray-500 text-white px-4 py-2 rounded-md placeholder-white focus:outline-none"
        />
        <button
          type="submit"
          className="bg-gray-600 text-white py-2 rounded-md hover:bg-gray-700 flex items-center justify-center"
        >
          Create your account →
        </button>
      </form>
    </div>
  );
}
