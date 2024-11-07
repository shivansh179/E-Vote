"use client";

import React from "react";

const LandingPage = () => {
  const handleScrollToSection = (sectionId: string) => {
    const sectionElement = document.getElementById(sectionId);
    if (sectionElement) {
      window.scrollTo({
        top: sectionElement.offsetTop,
        behavior: "smooth", // Adds smooth scrolling
      });
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Header Section */}
      <section className="bg-indigo-600 text-white py-20 text-center">
        <h1 className="text-5xl font-semibold mb-4">Welcome to India's Election App</h1>
        <p className="text-xl mb-6">Empowering Democracy with Digital Voting</p>
        <button
          className="bg-white text-indigo-600 px-6 py-3 rounded-full text-lg font-semibold hover:bg-gray-200 transition"
          onClick={() => handleScrollToSection("about")}
        >
          Learn More
        </button>
      </section>

      {/* About Section */}
      <section id="about" className="bg-white py-16 px-8">
        <h2 className="text-3xl font-semibold text-center text-indigo-600 mb-8">
          Why Do We Need Digital Voting?
        </h2>
        <div className="max-w-3xl mx-auto text-lg text-gray-700 space-y-6">
          <p>
            Elections are the cornerstone of any democracy. They provide citizens the power to choose their leaders,
            shaping the future of the nation. However, the process of voting can be cumbersome and time-consuming.
          </p>
          <p>
            Our digital voting app is designed to streamline the election process. It provides a secure, accessible,
            and efficient platform for every eligible citizen to cast their vote with ease. It ensures transparency,
            accuracy, and accessibility for all.
          </p>
          <p>
            Join us in revolutionizing India's election system. Together, we can create a more inclusive and efficient
            democratic process.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-indigo-50 py-16 px-8">
        <h2 className="text-3xl font-semibold text-center text-indigo-600 mb-8">
          Features of the Election App
        </h2>
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <h3 className="text-2xl font-semibold text-indigo-600 mb-4">Secure Voting</h3>
            <p className="text-gray-700">
              Our app ensures that each vote is securely stored and counted, providing an authentic election experience.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <h3 className="text-2xl font-semibold text-indigo-600 mb-4">Easy Access</h3>
            <p className="text-gray-700">
              Vote from anywhere with just a few clicks. Our platform is accessible on mobile, tablet, and desktop devices.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <h3 className="text-2xl font-semibold text-indigo-600 mb-4">Instant Results</h3>
            <p className="text-gray-700">
              Get real-time election results and track the progress as votes are counted.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="bg-indigo-600 text-white py-16 px-8 text-center">
        <h2 className="text-3xl font-semibold mb-4">Get Started Today</h2>
        <p className="text-lg mb-8">
          Join thousands of others who are empowering democracy with digital voting!
        </p>
        <button
          className="bg-white text-indigo-600 px-6 py-3 rounded-full text-lg font-semibold hover:bg-gray-200 transition"
          onClick={() => handleScrollToSection("signup")}
        >
          Register Now
        </button>
      </section>

      {/* Footer Section */}
      <footer className="bg-gray-800 text-white py-6 text-center">
        <p>&copy; 2024 ElectionApp | All Rights Reserved</p>
        <p>
          Follow us on:
          <a href="#" className="text-indigo-400 ml-2">Facebook</a> |
          <a href="#" className="text-indigo-400 ml-2">Twitter</a> |
          <a href="#" className="text-indigo-400 ml-2">Instagram</a>
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
