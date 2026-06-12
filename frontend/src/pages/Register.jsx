import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, MapPin, Wallet, Calendar } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ErrorMessage } from "../components/Feedback";

const Register = () => {
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name || !email || !password || !confirmPassword) {
      setError("All fields are required");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!agree) {
      setError("Please accept the Terms and Conditions");
      return;
    }

    const result = await register(name, email, password);

    if (result.success) {
      navigate("/dashboard");
    } else {
      setError(result.message);
    }
  };

  const passwordStrength = () => {
    if (password.length < 6) {
      return {
        width: "33%",
        color: "bg-red-500",
        text: "Weak",
      };
    }

    if (password.length < 10) {
      return {
        width: "66%",
        color: "bg-yellow-500",
        text: "Medium",
      };
    }

    return {
      width: "100%",
      color: "bg-green-500",
      text: "Strong",
    };
  };

  const strength = passwordStrength();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex">
      {/* Left Side */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1500530855697-b586d89ba3ee')] bg-cover bg-center opacity-20" />

        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-purple-600/20" />

        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="flex items-center gap-4 mb-8">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold">
              TS
            </div>

            <div>
              <h1 className="text-3xl font-bold">TripSync</h1>
              <p className="text-indigo-200">Travel Together. Split Smarter.</p>
            </div>
          </div>

          <h2 className="text-5xl font-bold leading-tight mb-6">
            Create unforgettable journeys with friends.
          </h2>

          <p className="text-lg text-gray-300 max-w-xl mb-10">
            Manage expenses, split bills, plan itineraries, and collaborate
            seamlessly in one platform.
          </p>

          <div className="space-y-5 max-w-md">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-indigo-500/20">
                <Wallet size={22} />
              </div>

              <div>
                <h3 className="font-semibold">Smart Expense Splitting</h3>

                <p className="text-sm text-gray-300">
                  Automatically calculate who owes whom.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-500/20">
                <Calendar size={22} />
              </div>

              <div>
                <h3 className="font-semibold">Trip Planning</h3>

                <p className="text-sm text-gray-300">
                  Organize itineraries and schedules.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-cyan-500/20">
                <MapPin size={22} />
              </div>

              <div>
                <h3 className="font-semibold">Places Wishlist</h3>

                <p className="text-sm text-gray-300">
                  Save destinations and attractions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
              TS
            </div>

            <div>
              <h1 className="text-white font-bold text-xl">TripSync</h1>

              <p className="text-gray-400 text-sm">
                Travel Together. Split Smarter.
              </p>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-white/10 border border-white/10 rounded-3xl shadow-2xl p-8">
            <h2 className="text-3xl font-bold text-white mb-2">
              Create Account
            </h2>

            <p className="text-gray-400 mb-8">
              Start planning trips and splitting expenses smarter.
            </p>

            {error && (
              <div className="mb-4">
                <ErrorMessage message={error} />
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Full Name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Rahul Sharma"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Email Address
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Password
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {password && (
                  <>
                    <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full ${strength.color}`}
                        style={{ width: strength.width }}
                      />
                    </div>

                    <p className="mt-1 text-xs text-gray-400">
                      Password Strength: {strength.text}
                    </p>
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Confirm Password
                </label>

                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <label className="flex items-start gap-3 text-sm text-gray-400">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="mt-1"
                />

                <span>
                  I agree to the{" "}
                  <span className="text-indigo-400 cursor-pointer hover:text-indigo-300">
                    Terms of Service
                  </span>{" "}
                  and{" "}
                  <span className="text-indigo-400 cursor-pointer hover:text-indigo-300">
                    Privacy Policy
                  </span>
                </span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 font-semibold text-white transition hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/30 disabled:opacity-50"
              >
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </form>

 
            <p className="mt-6 text-center text-gray-400 text-sm">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-medium text-indigo-400 hover:text-indigo-300"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
