// StaticApp.js
import React, { useEffect, useState, useRef } from 'react';
import { renderToString } from 'react-dom/server';

// Static Header Component
const Header = () => (
  <header className="bg-gray-800 text-white p-4 shadow-lg">
    <nav className="container mx-auto flex justify-between items-center">
      <h1 className="text-2xl font-bold">Photo Puzzle</h1>
      <div className="space-x-4">
        <a href="#play" className="hover:text-gray-300">Play</a>
        <a href="#about" className="hover:text-gray-300">About</a>
        <a href="#contact" className="hover:text-gray-300">Contact</a>
      </div>
    </nav>
  </header>
);

// Static Hero Section
const Hero = () => (
  <section className="bg-gray-900 text-white py-20">
    <div className="container mx-auto text-center">
      <h2 className="text-4xl font-bold mb-4">Transform Your Photos Into Puzzles</h2>
      <p className="text-xl mb-8">Challenge yourself with custom photo puzzles</p>
      <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg">
        Start Playing
      </button>
    </div>
  </section>
);

// Features Section
const Features = () => (
  <section className="py-16 bg-gray-800 text-white" id="about">
    <div className="container mx-auto px-4">
      <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          {
            title: 'Custom Photos',
            description: 'Upload your own photos to create unique puzzles'
          },
          {
            title: 'Adjustable Difficulty',
            description: 'Choose from multiple difficulty levels'
          },
          {
            title: 'Track Progress',
            description: 'Monitor your solving time and moves'
          }
        ].map((feature, index) => (
          <div key={index} className="bg-gray-700 p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
            <p>{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// Contact Section
const Contact = () => (
  <section className="py-16 bg-gray-900 text-white" id="contact">
    <div className="container mx-auto px-4">
      <h2 className="text-3xl font-bold text-center mb-8">Contact Us</h2>
      <div className="max-w-md mx-auto">
        <form className="space-y-4">
          <div>
            <label className="block mb-2">Name</label>
            <input
              type="text"
              className="w-full p-2 rounded bg-gray-800 border border-gray-700"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block mb-2">Email</label>
            <input
              type="email"
              className="w-full p-2 rounded bg-gray-800 border border-gray-700"
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label className="block mb-2">Message</label>
            <textarea
              className="w-full p-2 rounded bg-gray-800 border border-gray-700"
              rows="4"
              placeholder="Your message"
            ></textarea>
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Send Message
          </button>
        </form>
      </div>
    </div>
  </section>
);

// Footer
const Footer = () => (
  <footer className="bg-gray-800 text-white py-8">
    <div className="container mx-auto px-4 text-center">
      <p>&copy; 2024 Photo Puzzle. All rights reserved.</p>
    </div>
  </footer>
);

// Main App Component
const StaticApp = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      <main>
        <Hero />
        <Features />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

// Static HTML Generation Function
const generateStaticHTML = () => {
  const app = renderToString(<StaticApp />);
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Photo Puzzle</title>
    <meta name="description" content="Transform your photos into engaging puzzles">
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <!-- Critical CSS -->
    <style>
      /* Add any critical styles here */
    </style>
</head>
<body>
    <div id="root">${app}</div>
    <!-- Optional: Add minimal JavaScript for interactivity -->
    <script>
      // Add minimal JS here if needed
      document.querySelector('form').addEventListener('submit', (e) => {
        e.preventDefault();
        // Handle form submission
      });
    </script>
</body>
</html>
  `.trim();
};

export { StaticApp as default, generateStaticHTML };