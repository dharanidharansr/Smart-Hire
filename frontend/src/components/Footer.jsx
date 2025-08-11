import React from "react";
import { motion } from "framer-motion";

function Footer() {
  return (
    <footer className="bg-black py-6 border-t border-zinc-800">
      <div className="container mx-auto px-4 text-white max-w-5xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-inter text-zinc-400 text-sm"
          >
            © 2025 ScreenSmart. All rights reserved.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="font-inter mt-4 md:mt-0 text-zinc-400 text-sm"
          >
            Crafted by Hala Madrid
          </motion.p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
