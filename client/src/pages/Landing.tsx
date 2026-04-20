import { motion } from "framer-motion";
import { Link } from "react-router-dom";


const Landing = () => {
  return (
    <div className="bg-bg-primary text-text-primary selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
      {/* Hero Section */}
      <section className="hero-section px-6 md:px-12 border-b border-border-primary">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-6xl mx-auto"
        >
          <h1 className="headline-xl mb-12">
            Build system diagrams <br /> 
            <span className="text-text-muted">with pure logic.</span>
          </h1>
          
          <p className="text-body-large max-w-2xl mx-auto mb-16 px-4">
            Flowcraft AI transforms your system descriptions into professional technical diagrams using advanced models. 
            No complex UI, just reasoning.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link to="/diagram/create" className="btn-cta text-[18px]">
              Start Creating
            </Link>
            <Link to="/diagram/create" className="btn-secondary px-8 py-3 text-[18px]">
              View Showcase
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Feature Grid */}
      <section className="py-40 px-6 md:px-12 border-b border-border-primary">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16">
            <div>
              <h3 className="text-[14px] font-black uppercase tracking-[0.2em] mb-6 text-text-primary">Natural Generation</h3>
              <p className="text-[16px] text-text-secondary leading-relaxed">
                Describe your architecture in plain English. Our AI understands system complexity and produces clean Mermaid code instantly.
              </p>
            </div>
            <div>
              <h3 className="text-[14px] font-black uppercase tracking-[0.2em] mb-6 text-text-primary">Real-time Rendering</h3>
              <p className="text-[16px] text-text-secondary leading-relaxed">
                Watch your diagrams evolve as you refine your prompt. The live preview ensures your vision matches the output.
              </p>
            </div>
            <div>
              <h3 className="text-[14px] font-black uppercase tracking-[0.2em] mb-6 text-text-primary">15+ Templates</h3>
              <p className="text-[16px] text-text-secondary leading-relaxed">
                From Sequence Diagrams to C4 Architecture models. Support for all major Mermaid diagram types out of the box.
              </p>
            </div>
            <div>
              <h3 className="text-[14px] font-black uppercase tracking-[0.2em] mb-6 text-text-primary">Export & Sync</h3>
              <p className="text-[16px] text-text-secondary leading-relaxed">
                High-resolution SVG exports and minimalist short-links for sharing your architecture with your team.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-56 px-6 text-center">
        <h2 className="headline-lg mb-16">The architect is in.</h2>
        <Link to="/diagram/create" className="btn-cta px-16 py-5 text-[20px]">
          Get Started
        </Link>
      </section>

      {/* Footer */}
      <footer className="py-16 px-8 border-t border-border-primary">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="flex items-center gap-12 text-[12px] font-black uppercase tracking-[0.3em]">
            <span className="text-text-muted">© 2026 FLOWCRAFT</span>
            <a href="#" className="hover:text-text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-text-primary transition-colors">Terms</a>
          </div>
          <div className="text-[12px] font-black uppercase tracking-[0.3em] text-text-muted">
            Global Infrastructure
          </div>
        </div>
      </footer>
    </div>
  );
};



export default Landing;
