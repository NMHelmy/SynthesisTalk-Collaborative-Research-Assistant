import React, { useState } from "react";

export default function SignUpPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!firstName || !lastName || !password) {
      alert("Please fill in all fields.");
      return;
    }
    console.log("Creating account with:", firstName, lastName, password);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url('/logo.png')" }} // Ensure logo.png is in /public
    >
      <form onSubmit={handleSubmit} className="flex flex-col items-center space-y-4 w-full max-w-sm">
        <input
          type="text"
          placeholder="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="w-full bg-gray-400 text-white font-bold text-lg rounded-lg py-3 px-4 text-center placeholder-white"
        />
        <input
          type="text"
          placeholder="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="w-full bg-gray-400 text-white font-bold text-lg rounded-lg py-3 px-4 text-center placeholder-white"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-gray-400 text-white font-bold text-lg rounded-lg py-3 px-4 text-center placeholder-white"
        />
        <button
          type="submit"
          className="bg-gray-400 text-white font-bold text-lg rounded-xl py-3 px-6 hover:bg-gray-500 transition"
        >
          Create your account
        </button>
      </form>
    </div>
  );
}
