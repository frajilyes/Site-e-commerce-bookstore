import React from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Sparkles,
  Globe,
  Heart,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import "./About.css";
import { useNavigate } from "react-router-dom";

import Seo from "../Seo";
const About = () => {
  const milestones = [
    {
      title: "Launch",
      year: "2022",
      detail: "Started as a passion project with a carefully curated catalog.",
    },
    {
      title: "Growth",
      year: "2023",
      detail: "Reached 5,000 happy readers and expanded our genres.",
    },
    {
      title: "Future",
      year: "2024",
      detail: "Building smarter recommendations and faster delivery.",
    },
  ];

  const team = [
    {
      name: "Amina",
      role: "Founder",
      bio: "Reader, curator, and storyteller focused on bold new voices.",
    },
    {
      name: "Leo",
      role: "Operations",
      bio: "Ensures every book is delivered on time and in perfect condition.",
    },
    {
      name: "Maya",
      role: "Community",
      bio: "Builds the reader community and supports book lovers every day.",
    },
  ];
  const nav = useNavigate();

  return (
    <div className="about-advanced-shell">
      <Seo
        title="About"
        path="/about"
        description="Who we are: a bookshop built around curation, fair pricing and a fast, modern reading experience."
      />
      <section className="hero-block">
        <div className="hero-copy">
          <motion.span
            className="eyebrow"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            About Us
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            A next-gen bookstore for passionate readers.
          </motion.h1>
          <motion.p
            className="hero-copy-text"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            We merge curated recommendations, rapid delivery and a warm reading
            community to help every reader find their next great story.
          </motion.p>
        </div>

        <motion.div
          className="hero-stats"
          initial={{ opacity: 0, x: 80 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <div className="stat-card">
            <Sparkles size={24} />
            <span>Curated Collections</span>
          </div>
          <div className="stat-card">
            <Globe size={24} />
            <span>Global Shipping</span>
          </div>
          <div className="stat-card">
            <Heart size={24} />
            <span>Human Support</span>
          </div>
        </motion.div>
      </section>

      <section className="feature-grid">
        <motion.article
          className="feature-card"
          whileHover={{ y: -8 }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
        >
          <div className="feature-icon">
            <BookOpen size={24} />
          </div>
          <h3>Expert Selection</h3>
          <p>
            Handpicked books across genres, chosen by passionate readers and
            editors.
          </p>
        </motion.article>

        <motion.article
          className="feature-card"
          whileHover={{ y: -8 }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
        >
          <div className="feature-icon">
            <ShieldCheck size={24} />
          </div>
          <h3>Secure Experience</h3>
          <p>Smooth checkout, secure payments, and customer-first service.</p>
        </motion.article>

        <motion.article
          className="feature-card"
          whileHover={{ y: -8 }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
        >
          <div className="feature-icon">
            <TrendingUp size={24} />
          </div>
          <h3>Growing Community</h3>
          <p>
            Join readers who discover, review and share their favorite books.
          </p>
        </motion.article>
      </section>

      <section className="timeline-section">
        <div className="timeline-header">
          <span>Milestones</span>
          <h2>How our story unfolded</h2>
        </div>
        <div className="timeline-cards">
          {milestones.map((item) => (
            <motion.div
              className="timeline-card"
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5 }}
            >
              <span>{item.year}</span>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="team-section">
        <div className="team-intro">
          <span>Team</span>
          <h2>People behind the pages</h2>
        </div>
        <div className="team-grid">
          {team.map((member) => (
            <motion.div
              key={member.name}
              className="team-card"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <div className="avatar">{member.name.charAt(0)}</div>
              <h3>{member.name}</h3>
              <span>{member.role}</span>
              <p>{member.bio}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-copy">
          <span>Ready to read more?</span>
          <h2>Browse our evolving bookstore collection.</h2>
        </div>
        <button onClick={() => nav("/books")} className="cta-button">
          Explore books <ArrowRight size={18} />
        </button>
      </section>
    </div>
  );
};

export default About;
