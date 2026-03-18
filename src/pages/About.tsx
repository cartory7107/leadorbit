import { motion } from "framer-motion";
import { Mail, MessageCircle, Rocket, Building2, Globe, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import creatorImage from "@/assets/creator-profile.png";
import logoImage from "@/assets/logo.png";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logoImage} alt="Cartory Lead Orbit" className="w-8 h-8 rounded-lg object-contain" />
            <span className="font-semibold text-foreground text-sm">Cartory Lead Orbit</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to App
          </Link>
        </div>
      </header>

      <main className="pt-14">
        {/* Hero */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          <div className="container max-w-3xl mx-auto px-4 text-center relative">
            <motion.div
              custom={0}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="mb-8"
            >
              <div className="relative inline-block">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-primary to-accent opacity-50 blur-md" />
                <img
                  src={creatorImage}
                  alt="AL-AMIN JISAN"
                  className="relative w-32 h-32 rounded-full object-cover border-2 border-primary/30"
                />
              </div>
            </motion.div>

            <motion.h1
              custom={1}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="text-4xl md:text-5xl font-black text-foreground tracking-tight"
            >
              AL-AMIN JISAN
            </motion.h1>

            <motion.p
              custom={2}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="text-lg text-primary font-semibold mt-3"
            >
              CEO of Cartory BD
            </motion.p>

            <motion.p
              custom={3}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="text-muted-foreground mt-4 max-w-lg mx-auto leading-relaxed"
            >
              Founder and CEO of Cartory BD, building AI-powered lead generation systems and global SaaS tools.
            </motion.p>

            <motion.div
              custom={4}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary font-medium"
            >
              <Rocket className="w-4 h-4" />
              Built for Global Growth
            </motion.div>
          </div>
        </section>

        {/* Contact Cards */}
        <section className="py-12">
          <div className="container max-w-3xl mx-auto px-4">
            <motion.h2
              custom={5}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="text-2xl font-bold text-foreground mb-6 text-center"
            >
              📩 Get in Touch
            </motion.h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <motion.a
                href="mailto:cartorymain@gmail.com"
                custom={6}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="group p-6 rounded-xl bg-card border border-border/50 hover:border-primary/40 transition-all duration-300"
                style={{ boxShadow: "var(--shadow-subtle)" }}
                whileHover={{ y: -4, boxShadow: "var(--shadow-hover)" }}
              >
                <Mail className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-semibold text-foreground text-sm mb-1">Business Email</h3>
                <p className="text-muted-foreground text-sm">cartorymain@gmail.com</p>
              </motion.a>

              <motion.a
                href="https://wa.me/8801843253599"
                target="_blank"
                rel="noopener noreferrer"
                custom={7}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="group p-6 rounded-xl bg-card border border-border/50 hover:border-accent/40 transition-all duration-300"
                style={{ boxShadow: "var(--shadow-subtle)" }}
                whileHover={{ y: -4, boxShadow: "var(--shadow-hover)" }}
              >
                <MessageCircle className="w-8 h-8 text-accent mb-3" />
                <h3 className="font-semibold text-foreground text-sm mb-1">WhatsApp</h3>
                <p className="text-muted-foreground text-sm mb-3">Chat with me directly</p>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-foreground bg-accent/20 border border-accent/30 rounded-full px-3 py-1">
                  Chat on WhatsApp
                </span>
              </motion.a>
            </div>
          </div>
        </section>

        {/* Company Info */}
        <section className="py-12">
          <div className="container max-w-3xl mx-auto px-4">
            <motion.div
              custom={8}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="p-8 rounded-xl bg-card border border-border/50"
              style={{ boxShadow: "var(--shadow-subtle)" }}
            >
              <div className="flex items-center gap-3 mb-4">
                <Building2 className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-bold text-foreground">About Cartory BD</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Cartory Lead Orbit is a product of Cartory BD (GOC).
                Cartory BD builds AI automation tools, lead generation systems, and international SaaS platforms.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Ecosystem */}
        <section className="py-12 pb-20">
          <div className="container max-w-3xl mx-auto px-4">
            <motion.div
              custom={9}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="p-8 rounded-xl bg-gradient-to-br from-card to-secondary/30 border border-primary/10"
              style={{ boxShadow: "var(--shadow-glow)" }}
            >
              <div className="flex items-center gap-3 mb-4">
                <Globe className="w-6 h-6 text-accent" />
                <h2 className="text-xl font-bold text-foreground">Our Ecosystem</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Cartory Lead Orbit is part of the Cartory ecosystem, including tools like Cartory Roastify AI and other AI-powered platforms.
              </p>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container text-center">
          <p className="text-sm text-muted-foreground">Cartory Lead Orbit — AI Powered Lead Discovery</p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <Link to="/" className="text-xs text-muted-foreground hover:text-primary transition-colors">Home</Link>
            <a href="#" className="text-xs text-muted-foreground hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="text-xs text-muted-foreground hover:text-primary transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default About;
