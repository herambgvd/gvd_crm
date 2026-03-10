import React from "react";
import { useNavigate } from "react-router-dom";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center px-4">
      <FileQuestion className="w-20 h-20 text-gray-300 mb-6" />
      <h1 className="text-6xl font-bold text-gray-800 mb-2">404</h1>
      <p className="text-xl text-gray-500 mb-1">Page Not Found</p>
      <p className="text-sm text-gray-400 mb-8">
        The page you are looking for doesn&apos;t exist or has been removed.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => navigate(-1)}
          className="px-5 py-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors text-sm"
        >
          Go Back
        </button>
        <button
          onClick={() => navigate("/dashboard")}
          className="px-5 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
