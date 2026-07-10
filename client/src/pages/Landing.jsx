import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const Landing = () => {
  useEffect(() => {
    // Add landing-page class to body for background image
    document.body.classList.add('landing-page');
    return () => {
      document.body.classList.remove('landing-page');
    };
  }, []);

  return (
    <div className="landing-page">
      {/* Navbar */}
      <nav className="navbar">
        <div className="logo">💠 SocietyConnect</div>
        <div className="nav-links">
          <a href="/">Home</a>
          <a href="#">Residents</a>
          <Link to="/login" className="nav-login">Security Login</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <div className="hero-text">
            <h1>Welcome to SocietyConnect</h1>
            <p>Modern Society Management System</p>
            <Link to="/login" className="hero-btn-primary">Get Started</Link>
          </div>
        </div>

        {/* Login Cards */}
        <div className="login-card-home">
          <Link to="/login" className="card-btn admin">Admin Login</Link>
          <Link to="/login" className="card-btn resident">Resident Login</Link>
          <Link to="/login" className="card-btn security">Security Login</Link>
        </div>
      </header>
    </div>
  );
};

export default Landing;
