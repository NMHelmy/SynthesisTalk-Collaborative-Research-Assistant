import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Add login logic here (e.g., API call)
    console.log("Login with:", formData);
  };

  return (
    <div className="min-h-screen bg-gray-800 text-white flex flex-col items-center justify-center px-4">
      <h2 className="text-3xl font-bold mb-6">Welcome back!</h2>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col space-y-4 w-full max-w-sm"
      >
        <input
          type="text"
          name="email"
          placeholder="Email or Username"
          value={formData.email}
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
          className="bg-gray-600 py-2 rounded-md hover:bg-gray-700"
        >
          Sign in
        </button>
        <div className="text-sm text-center mt-2 text-gray-400">
          <p className="hover:underline cursor-pointer" onClick={() => alert("Forgot Password")}>Forgot Password?</p>
          <p>
            Don’t have an account?{' '}
            <span className="hover:underline cursor-pointer text-blue-400" onClick={() => navigate("/signup")}>
              Sign Up
            </span>
          </p>
        </div>
      </form>
    </div>
  );
}